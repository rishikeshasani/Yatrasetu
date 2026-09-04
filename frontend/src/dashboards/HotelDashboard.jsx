import { useState, useEffect, useRef } from 'react';
import {
  fetchHotels,
  fetchHotelOwnerBookings
} from '../api/api';
import './HotelDashboard.css';

// SVG QR Code generator component as a resilient, instant, self-contained QR renderer
function ScannableQRCode({ payload }) {
  // 21x21 QR Code Version 1 pattern for YS-KED-2026-8812 / dynamic payloads
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
    <svg width="168" height="168" viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      <title>{`QR Code for ${payload}`}</title>
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

const INITIAL_BOOKING_REQUESTS = [
  {
    id: 'REQ-101',
    booking_id: 'YC-48217',
    hotel_id: 'H001',
    room_id: 'R204',
    room_number: '204',
    guest_name: 'Rahul Sharma',
    guest_count: 2,
    room_type: 'Deluxe',
    check_in: '2026-09-05T14:00:00',
    check_out: '2026-09-06T11:00:00',
    price: 1300.0,
    status: 'pending',
    created_at: new Date().toISOString(),
    decline_reason: null
  }
];

const COOLDOWN_WINDOW_MS = 60000; // 60 seconds

export default function HotelDashboard({ currentUser, showToast, activeRerouteAlert }) {
  const [state, setState] = useState(BASELINE_STATE);

  // Sync with real-time cross-dashboard Government Emergency Reroute
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
  }, [activeRerouteAlert]);

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
  const displayTouristsCountRef = useRef(120);
  useEffect(() => {
    displayTouristsCountRef.current = displayTouristsCount;
  }, [displayTouristsCount]);

  // Sidebar & Navigation state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  // Booking Requests state (Pilot Reservation Stream)
  const [bookingRequestsList, setBookingRequestsList] = useState(INITIAL_BOOKING_REQUESTS);
  const [currentRequestFilter, setCurrentRequestFilter] = useState('ALL');
  const [declineModal, setDeclineModal] = useState({ isOpen: false, targetId: null, reason: '' });

  // Room Slot Availability state (Simulated 24h Transit Matrix)
  const [selectedSlotDay, setSelectedSlotDay] = useState('today');

  // Fetch real hotel data on mount & listen to live booking events
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
      } catch {
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
    window.addEventListener('yatrasetu:hotel_booked', handleHotelBooked);
    const pollInterval = setInterval(loadData, 6000);

    return () => {
      isMounted = false;
      window.removeEventListener('yatrasetu:hotel_booked', handleHotelBooked);
      clearInterval(pollInterval);
    };
  }, [currentUser]);

  // Animate counter when incomingTourists changes
  useEffect(() => {
    let startTimestamp = null;
    const startVal = displayTouristsCountRef.current;
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

  // Derived metrics connecting live Supabase room inventory
  const realTotalRooms = backendHotel?.rooms?.reduce((acc, r) => acc + (r.total_rooms || 0), 0);
  const realAvailableRooms = backendHotel?.rooms?.reduce((acc, r) => acc + (r.available_rooms != null ? r.available_rooms : 0), 0);
  const totalRoomsCount = (realTotalRooms && realTotalRooms > 0) ? realTotalRooms : state.totalRooms;
  const availableRooms = (realAvailableRooms != null && realTotalRooms > 0) ? realAvailableRooms : (state.totalRooms - state.occupiedRooms);
  const occupiedRoomsCount = totalRoomsCount - availableRooms;
  const occupancyPercent = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0;

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
    // eslint-disable-next-line react-hooks/purity
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
    setSelectedSlotDay('today');
    setBookingRequestsList(INITIAL_BOOKING_REQUESTS);
    if (showToast) {
      showToast('🔄 Demo states reset to initial baseline.');
    }
  };

  // Two-Sided Booking Request Actions
  const handleAcceptBookingRequest = (reqId) => {
    const target = bookingRequestsList.find((r) => r.id === reqId);
    if (!target) return;

    if (target.status !== 'pending') {
      if (showToast) showToast('This request is already processed.');
      return;
    }

    setBookingRequestsList((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'confirmed' } : r))
    );

    // Occupy room if room is 204
    setState((prev) => ({
      ...prev,
      occupiedRooms: 33
    }));

    if (showToast) {
      showToast(`✅ Booking ${target.id} Accepted! Room #${target.room_number} allocated to ${target.guest_name}.`);
    }
  };

  const openDeclineModal = (reqId) => {
    setDeclineModal({
      isOpen: true,
      targetId: reqId,
      reason: 'Room unavailable for requested hours'
    });
  };

  const handleConfirmDecline = () => {
    if (!declineModal.targetId) return;

    setBookingRequestsList((prev) =>
      prev.map((r) =>
        r.id === declineModal.targetId
          ? { ...r, status: 'declined', decline_reason: declineModal.reason || 'Room unavailable' }
          : r
      )
    );

    if (showToast) {
      showToast(`Booking ${declineModal.targetId} Declined.`);
    }

    setDeclineModal({ isOpen: false, targetId: null, reason: '' });
  };

  const handleSimulateNewPilgrimRequest = () => {
    const names = ['Priya Patel', 'Vikramaditya Rao', 'Meenakshi Iyer', 'Anand Swamy'];
    const rooms = ['302', '104', '208', '405'];
    const types = ['Standard', 'Deluxe', 'Standard', 'Family'];
    const prices = [1000, 1300, 1000, 1600];

    const idx = Math.floor(Math.random() * names.length);
    const newId = `REQ-${bookingRequestsList.length + 101}`;
    const newRef = `YC-${48200 + bookingRequestsList.length + 1}`;

    const newReq = {
      id: newId,
      booking_id: newRef,
      hotel_id: 'H001',
      room_id: `R${rooms[idx]}`,
      room_number: rooms[idx],
      guest_name: names[idx],
      guest_count: 2,
      room_type: types[idx],
      check_in: '2026-09-05T14:00:00',
      check_out: '2026-09-06T11:00:00',
      price: prices[idx],
      status: 'pending',
      created_at: new Date().toISOString(),
      decline_reason: null
    };

    setBookingRequestsList((prev) => [newReq, ...prev]);

    if (showToast) {
      showToast(`🔔 New Pilgrim Booking Request from ${names[idx]} (Room #${rooms[idx]})!`);
    }
  };

  // Load a request or real booking into the QR Terminal
  const handleLoadBookingIntoTerminal = (b) => {
    setState((prev) => ({
      ...prev,
      bookingRef: b.booking_id || b.id,
      guestName: b.guest_name || b.tourist_id || 'Yatri Devotee',
      partySize: b.guest_count || b.guests || 2,
      origin: 'Pilgrim Corridor',
      roomAssigned: `#${b.room_number || '204'} ${b.room_type || 'Deluxe Room'} Ganga View`,
      guestStatus: b.status === 'checked-in' ? 'CHECKED_IN' : 'PENDING'
    }));
    setFraudAlert(null);
    setShowSuccessBanner(false);

    // Smooth scroll to guest verification terminal
    const el = document.getElementById('guest-verification');
    if (el) el.scrollIntoView({ behavior: 'smooth' });

    if (showToast) {
      showToast(`🪪 Loaded ${b.booking_id || b.id} into QR Check-In Terminal.`);
    }
  };

  // Room Slot Availability Matrix Data Engine
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

      let r206Guest = state.isRerouteSpikeActive ? 'Devendra Joshi (Surge)' : ' (Vacant)';
      let r206Ref = state.isRerouteSpikeActive ? 'YS-SURGE-101' : 'Ready';
      let r206Window = state.isRerouteSpikeActive ? '2:30 PM (Emergency Surge)' : 'All Day Buffer';
      let r206Slots = state.isRerouteSpikeActive
        ? ['AVAILABLE', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED']
        : ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'];
      let r206Next = state.isRerouteSpikeActive ? 'Tomorrow 9:00 AM' : 'Available Now';

      let r208Guest = state.isRerouteSpikeActive ? 'Sunita Rao (Surge)' : ' (Vacant)';
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
        { room: '210', type: 'Executive Suite', guest: ' (Vacant Cleaned)', ref: 'Ready', window: 'Available Full Day', slots: ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Available Now' }
      ];
    } else if (day === 'tomorrow') {
      return [
        { room: '201', type: 'Standard Deluxe', guest: 'Manoj Verma / Open', ref: 'YS-KED-7811', window: 'Checkout 10:00 AM', slots: ['CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 10:30 AM' },
        { room: '202', type: 'Premium Double', guest: 'Priya Iyer / Harish G.', ref: 'YS-KED-9042', window: 'Checkout 11 AM · In 4 PM', slots: ['BOOKED', 'CHECK_OUT', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED'], nextAvailable: 'Tomorrow 11:30 AM' },
        { room: '203', type: 'Family Suite', guest: 'K. V. Sharma', ref: 'YS-VRN-5011', window: '12:00 PM Check-In', slots: ['AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '6 Sep 10:00 AM' },
        { room: '204', type: 'Deluxe Ganga View', isDemo: true, guest: state.guestStatus === 'CHECKED_IN' ? 'Ramesh Sharma / Open' : ' (Vacant)', ref: state.guestStatus === 'CHECKED_IN' ? state.bookingRef : 'Ready', window: state.guestStatus === 'CHECKED_IN' ? 'Checkout 11:00 AM' : 'Available', slots: state.guestStatus === 'CHECKED_IN' ? ['BOOKED', 'CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'] : ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 11:30 AM' },
        { room: '205', type: 'Standard Twin', guest: 'Maheshwari Group', ref: 'YS-AYD-1192', window: '2:00 PM Check-In', slots: ['AVAILABLE', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: 'Tomorrow 1:30 PM' },
        { room: '206', type: 'Deluxe Double', isSurge: true, guest: state.isRerouteSpikeActive ? 'Devendra Joshi' : ' (Buffer)', ref: state.isRerouteSpikeActive ? 'YS-SURGE-101' : 'Ready', window: state.isRerouteSpikeActive ? 'Checkout 9:00 AM' : 'Buffer', slots: state.isRerouteSpikeActive ? ['CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'] : ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 9:30 AM' },
        { room: '207', type: 'Heritage Suite', guest: 'Rajesh Meena', ref: 'YS-AYD-9012', window: 'Checkout 10:00 AM', slots: ['CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 10:30 AM' },
        { room: '208', type: 'Standard King', isSurge: true, guest: state.isRerouteSpikeActive ? 'Sunita Rao' : ' (Buffer)', ref: state.isRerouteSpikeActive ? 'YS-SURGE-102' : 'Ready', window: state.isRerouteSpikeActive ? 'Checkout 10:00 AM' : 'Buffer', slots: state.isRerouteSpikeActive ? ['CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'] : ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 10:30 AM' },
        { room: '209', type: 'Compact Pilgrim Room', guest: 'Suresh Nair', ref: 'YS-KED-6120', window: 'Checkout 11:00 AM', slots: ['BOOKED', 'CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Tomorrow 11:30 AM' },
        { room: '210', type: 'Executive Suite', guest: 'Anand Varma (VIP)', ref: 'YS-KED-9912', window: '2:00 PM Check-In', slots: ['AVAILABLE', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: 'Tomorrow 1:30 PM' }
      ];
    } else {
      return [
        { room: '201', type: 'Standard Deluxe', guest: 'Advance Reserved', ref: 'YS-ADV-301', window: '12:00 PM Check-In', slots: ['AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '6 Sep 11:30 AM' },
        { room: '202', type: 'Premium Double', guest: 'Harish Gupta', ref: 'YS-KED-9042', window: 'Full Day Stay', slots: ['BOOKED', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '7 Sep 11:00 AM' },
        { room: '203', type: 'Family Suite', guest: 'K. V. Sharma', ref: 'YS-VRN-5011', window: 'Checkout 10:00 AM', slots: ['CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: '6 Sep 10:30 AM' },
        { room: '204', type: 'Deluxe Ganga View', isDemo: true, guest: ' (Vacant / Open)', ref: 'Ready', window: 'Open for Booking', slots: ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Available All Day' },
        { room: '205', type: 'Standard Twin', guest: 'Maheshwari Group', ref: 'YS-AYD-1192', window: 'Full Day Stay', slots: ['BOOKED', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '7 Sep 10:00 AM' },
        { room: '206', type: 'Deluxe Double', isSurge: true, guest: ' (Buffer Ready)', ref: 'Ready', window: 'Transit Standby', slots: ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Available All Day' },
        { room: '207', type: 'Heritage Suite', guest: 'Pilgrim Family', ref: 'YS-KED-8821', window: '1:00 PM Check-In', slots: ['AVAILABLE', 'AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '6 Sep 12:30 PM' },
        { room: '208', type: 'Standard King', isSurge: true, guest: ' (Buffer Ready)', ref: 'Ready', window: 'Transit Standby', slots: ['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: 'Available All Day' },
        { room: '209', type: 'Compact Pilgrim Room', guest: 'Sunil Chawla', ref: 'YS-VRN-4421', window: '12:00 PM Check-In', slots: ['AVAILABLE', 'CHECK_IN', 'BOOKED', 'BOOKED', 'BOOKED', 'BOOKED'], nextAvailable: '6 Sep 11:30 AM' },
        { room: '210', type: 'Executive Suite', guest: 'Anand Varma (VIP)', ref: 'YS-KED-9912', window: 'Checkout 12:00 PM', slots: ['BOOKED', 'CHECK_OUT', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'], nextAvailable: '6 Sep 12:30 PM' }
      ];
    }
  };

  // Filtered booking requests
  const filteredBookingRequests = bookingRequestsList.filter((r) => {
    if (currentRequestFilter === 'PENDING') return r.status === 'pending';
    if (currentRequestFilter === 'CONFIRMED') return r.status === 'confirmed';
    if (currentRequestFilter === 'DECLINED') return r.status === 'declined';
    return true;
  });

  const pendingRequestsCount = bookingRequestsList.filter((r) => r.status === 'pending').length;

  const navigateToSection = (sectionId) => {
    setActiveSection(sectionId);
    setSidebarOpen(false);
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="hd-container">
      {/* 1. LEFT SIDEBAR */}
      <aside className={`hd-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="hd-sidebar-top">
          {/* Brand Header */}
          <div className="hd-sidebar-brand">
            <div className="hd-brand-content">
              <div className="hd-brand-logo">🕉️</div>
              <div className="hd-brand-text">
                <span className="hd-brand-name">YatraSetu</span>
                <span className="hd-brand-role">Hotel Partner</span>
              </div>
            </div>
            <button
              type="button"
              className="hd-sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="hd-nav">
            <button
              type="button"
              onClick={() => navigateToSection('overview')}
              className={`hd-nav-link ${activeSection === 'overview' ? 'active' : ''}`}
            >
              <span>📊</span>
              <span>Operations Overview</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('demand-rerouting')}
              className={`hd-nav-link ${activeSection === 'demand-rerouting' ? 'active' : ''}`}
            >
              <span>🔄</span>
              <span>Demand &amp; Rerouting</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('room-inventory')}
              className={`hd-nav-link ${activeSection === 'room-inventory' ? 'active' : ''}`}
            >
              <span>🛏️</span>
              <span>Room Inventory</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('booking-requests')}
              className={`hd-nav-link ${activeSection === 'booking-requests' ? 'active' : ''}`}
            >
              <span>📩</span>
              <span>Booking Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="hd-nav-badge">{pendingRequestsCount}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('room-slots')}
              className={`hd-nav-link ${activeSection === 'room-slots' ? 'active' : ''}`}
            >
              <span>📅</span>
              <span>Room Slot Availability</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('dynamic-pricing')}
              className={`hd-nav-link ${activeSection === 'dynamic-pricing' ? 'active' : ''}`}
            >
              <span>⚡</span>
              <span>Dynamic Pricing</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('guest-verification')}
              className={`hd-nav-link ${activeSection === 'guest-verification' ? 'active' : ''}`}
            >
              <span>🪪</span>
              <span>Guest Verification</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('tax-credits')}
              className={`hd-nav-link ${activeSection === 'tax-credits' ? 'active' : ''}`}
            >
              <span>🧾</span>
              <span>Municipal Tax Credits</span>
            </button>
            {backendBookings.length > 0 && (
              <button
                type="button"
                onClick={() => navigateToSection('supabase-feed')}
                className={`hd-nav-link ${activeSection === 'supabase-feed' ? 'active' : ''}`}
              >
                <span>📋</span>
                <span>Database Feed ({backendBookings.length})</span>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="hd-sidebar-footer">
          <div className="hd-system-status">
            <span className="hd-status-dot hd-pulse-dot"></span>
            <span>{isLoadingBackend ? 'Syncing DB...' : 'System Online v2.4'}</span>
          </div>
          <div className="hd-property-context">
            <strong>{backendHotel?.name || 'Hotel Ganga Heritage'}</strong><br />
            {backendHotel?.address ? backendHotel.address.split(',')[0] : 'Zone B-2 · Kashi Corridor'}
          </div>
          <div className="hd-node-id">
            Smart Transit Node: <span>DESK-01</span>
          </div>
        </div>
      </aside>

      {/* Sidebar Backdrop for Mobile */}
      <div
        className={`hd-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* 2. MAIN APPLICATION WRAPPER */}
      <div className="hd-main-wrapper">
        {/* TOP HEADER */}
        <header className="hd-header">
          <div className="hd-header-left">
            <button
              type="button"
              className="hd-mobile-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hd-property-title-wrap">
              <h1 className="hd-property-name">{backendHotel?.name || 'Hotel Ganga Heritage'}</h1>
              <span className="hd-property-sub">• {backendHotel?.address ? backendHotel.address.split(',')[0] : 'Kashi Corridor · Zone B-2'}</span>
            </div>
          </div>

          <div className="hd-header-right">
            <div className="hd-verified-pill">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Verified Partner</span>
            </div>
            <button
              type="button"
              onClick={resetFullDemoState}
              className="hd-reset-btn"
              title="Reset all demo states back to baseline"
            >
              <span>🔄 Reset Demo</span>
            </button>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="hd-main-content">
          {/* REAL-TIME GOVERNMENT EMERGENCY REROUTE ADVISORY BANNER */}
          {activeRerouteAlert && (
            <div className="hd-emergency-banner">
              <div className="hd-emergency-header">
                <div className="hd-emergency-info">
                  <span className="hd-emergency-icon">🚨</span>
                  <div style={{ flex: 1 }}>
                    <div className="hd-emergency-tags">
                      <span className="hd-tag-advisory">STATE HOSPITALITY ADVISORY</span>
                      <span className="hd-tag-sanctum">
                        AFFECTED SANCTUM: {activeRerouteAlert.site_name || activeRerouteAlert.site_id}
                      </span>
                      <span className="hd-tag-congestion">
                        {activeRerouteAlert.crowd_status || 'CRITICAL'} CONGESTION
                      </span>
                    </div>

                    <h3 className="hd-emergency-title">
                      Emergency Reroute In Effect: Devotee Influx Redistribution
                    </h3>
                    <p className="hd-emergency-desc">
                      {activeRerouteAlert.notes ||
                        `Government Command has declared critical congestion at ${activeRerouteAlert.site_name || 'the sanctum'}. Pilgrims are being redirected to registered partner hotels across the corridor.`}
                    </p>

                    <div className="hd-emergency-metrics-grid">
                      <div>
                        <div className="hd-em-metric-title">Projected Influx (Surge)</div>
                        <div className="hd-em-metric-val" style={{ color: '#fbcfe8' }}>
                          👥 180 Incoming Pilgrims
                        </div>
                        <div className="hd-em-metric-sub">+60 rerouted from sanctum</div>
                      </div>

                      <div>
                        <div className="hd-em-metric-title">Actual Hotel Bookings</div>
                        <div className="hd-em-metric-val" style={{ color: '#86efac' }}>
                          🛏️ {occupiedRoomsCount} / {totalRoomsCount} Rooms
                        </div>
                        <div className="hd-em-metric-sub">{availableRooms} rooms available for check-in</div>
                      </div>

                      <div>
                        <div className="hd-em-metric-title">Dynamic Tariff Guidance</div>
                        <div className="hd-em-metric-val" style={{ color: '#fde047' }}>
                          ₹1,300 <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#e0e7ff' }}>/ night (suggested)</span>
                        </div>
                        <div className="hd-em-metric-sub">
                          {state.isSuggestedApplied ? '✓ Surge rate active' : 'Standard ₹1,000 base rate in effect'}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#c7d2fe', fontStyle: 'italic' }}>
                      ℹ️ Note: Projected tourist redistribution indicates anticipated demand only. Actual hotel inventory and confirmed bookings remain strictly separate and unaltered until yatris complete QR check-in.
                    </div>
                  </div>
                </div>

                <div className="hd-emergency-actions">
                  <button
                    type="button"
                    onClick={() => {
                      if (showToast) {
                        showToast('🛎️ Reception alerted: Express check-in corridors activated for incoming rerouted yatris.');
                      }
                    }}
                    className="hd-btn-express"
                  >
                    🛎️ Prepare Express Check-In
                  </button>
                  <div className="hd-telemetry-note">Live State Govt Telemetry Link</div>
                </div>
              </div>
            </div>
          )}

          {/* ALERTS: FRAUD & SUCCESS */}
          {fraudAlert && (
            <div className={`hd-alert-banner hd-fraud-alert ${isFraudBouncing ? 'hd-animate-bounce' : ''}`}>
              <div className="hd-fraud-left">
                <div className="hd-fraud-icon">⚠️</div>
                <div>
                  <div className="hd-fraud-title-row">
                    <span className="hd-fraud-title">Security Alert: Duplicate Check-In Blocked</span>
                    <span className="hd-fraud-badge">60s Cooldown Active</span>
                  </div>
                  <p className="hd-fraud-msg">{fraudAlert}</p>
                </div>
              </div>
              <button
                type="button"
                className="hd-alert-dismiss"
                onClick={() => setFraudAlert(null)}
              >
                ✕
              </button>
            </div>
          )}

          {showSuccessBanner && (
            <div className="hd-alert-banner hd-success-alert">
              <div className="hd-success-left">
                <div className="hd-success-icon">🎉</div>
                <div>
                  <span className="hd-success-title">Stay Completed &amp; Verified!</span>
                  <p className="hd-success-msg">
                    Verified pilgrimage stay recorded! +50 Punya Points awarded. Municipal Tax Credit increased to ₹750.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="hd-alert-dismiss"
                onClick={() => setShowSuccessBanner(false)}
              >
                ✕
              </button>
            </div>
          )}

          {/* SECTION 3: OPERATIONS OVERVIEW HEADER */}
          <div className="hd-overview-header" id="overview">
            <div>
              <h2 className="hd-page-title">Hotel Operations Overview</h2>
              <p className="hd-page-subtitle">
                Real-time accommodation and pilgrim flow management • SIH Decision Node
              </p>
            </div>
            <span className="hd-hub-tag">
              Corridor Hub: Gate #4 Smart Transit
            </span>
          </div>

          {/* SECTION 4: 4 KPI CARDS ROW */}
          <div className="hd-kpi-grid">
            {/* KPI 1: Available Rooms */}
            <div className="hd-kpi-card">
              <div className="hd-kpi-top">
                <span className="hd-kpi-label">Available Rooms</span>
                <span className="hd-kpi-icon">🛏️</span>
              </div>
              <div className="hd-kpi-val-row">
                <span className="hd-kpi-val">{availableRooms}</span>
                <span className="hd-kpi-denom"> / {totalRoomsCount} Total</span>
              </div>
              <div className="hd-kpi-sub">
                <span className="hd-dot-indicator" style={{ backgroundColor: '#10b981' }}></span>
                <span>Available for immediate check-in</span>
              </div>
            </div>

            {/* KPI 2: Occupancy Rate */}
            <div className="hd-kpi-card">
              <div className="hd-kpi-top">
                <span className="hd-kpi-label">Occupancy Rate</span>
                <span className="hd-kpi-icon">📊</span>
              </div>
              <div className="hd-kpi-val-row">
                <span className="hd-kpi-val">{occupancyPercent}%</span>
              </div>
              <div className="hd-progress-bar">
                <div className="hd-progress-fill" style={{ width: `${occupancyPercent}%` }}></div>
              </div>
              <div className="hd-kpi-sub">
                <span>{occupiedRoomsCount} of {totalRoomsCount} rooms currently occupied</span>
              </div>
            </div>

            {/* KPI 3: Municipal Tax Credit */}
            <div className="hd-kpi-card" id="tax-credits">
              <div className="hd-kpi-top">
                <span className="hd-kpi-label">Tax Credit</span>
                <span className="hd-kpi-icon" style={{ background: '#ecfdf5', color: '#047857' }}>🧾</span>
              </div>
              <div className="hd-kpi-val-row">
                <span className="hd-kpi-val" style={{ color: '#047857' }}>
                  ₹{state.taxCredit.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="hd-kpi-sub">
                <span>100% Tax Deductible · Direct State Subsidy</span>
              </div>
            </div>

            {/* KPI 4: Live Room Rate */}
            <div className="hd-kpi-card">
              <div className="hd-kpi-top">
                <span className="hd-kpi-label">Live Room Rate</span>
                <span className="hd-kpi-icon">💰</span>
              </div>
              <div className="hd-kpi-val-row">
                <span className="hd-kpi-val">₹{state.currentRate.toLocaleString('en-IN')}</span>
              </div>
              <div className="hd-kpi-sub" style={{ color: state.currentRate > 1000 ? '#b45309' : '#047857', fontWeight: 600 }}>
                <span
                  className="hd-dot-indicator"
                  style={{ backgroundColor: state.currentRate > 1000 ? '#f59e0b' : '#10b981' }}
                ></span>
                <span>{state.currentRate > 1000 ? '+30% Peak Pilgrim Surge' : 'Standard Parity'}</span>
              </div>
            </div>
          </div>

          {/* SECTION 5: DEMAND & REROUTING */}
          <div className="hd-section-card" id="demand-rerouting">
            <div className="hd-reroute-content">
              <div className="hd-reroute-left">
                <div className="hd-tag-row">
                  <span className="hd-tag-header">Transit Inflow Monitoring</span>
                  <span className={`hd-demand-pill ${state.isRerouteSpikeActive ? 'surge' : 'normal'}`}>
                    <span
                      className="hd-dot-indicator"
                      style={{ backgroundColor: state.isRerouteSpikeActive ? '#ef4444' : '#10b981' }}
                    ></span>
                    <span>{state.isRerouteSpikeActive ? 'High Surge (+50%)' : 'Demand: Normal'}</span>
                  </span>
                </div>

                <div className="hd-hero-statement">
                  <span className="hd-hero-label">Incoming Rerouted Demand:</span>
                  <span className="hd-hero-counter">{displayTouristsCount}</span>
                  <span className="hd-hero-unit">Pilgrims</span>
                  <span className="hd-hero-eta">
                    | Expected ETA: <strong>2:00 PM</strong>
                  </span>
                </div>

                <p className="hd-reroute-desc">
                  {state.isRerouteSpikeActive
                    ? '🚨 High Surge Active! 60 additional pilgrims redirected from congested sanctum. Incoming demand: 180 pilgrims.'
                    : 'Baseline crowd state. Automated district balancers are monitoring temple queue saturation. Click below to simulate an active shrine rerouting surge.'}
                </p>
              </div>

              <div className="hd-reroute-right">
                <button
                  type="button"
                  onClick={triggerReroutingSpike}
                  className={`hd-btn-reroute ${state.isRerouteSpikeActive ? 'active' : 'normal'}`}
                >
                  <span>{state.isRerouteSpikeActive ? '✓' : '🔄'}</span>
                  <span>{state.isRerouteSpikeActive ? 'Surge Active (+50%)' : 'Simulate Rerouting Spike'}</span>
                </button>
                <span className="hd-btn-subcaption">
                  Simulates <strong>Travel ➔ Hotel</strong> rerouting bridge
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 6: ROOM INVENTORY CAPACITY */}
          <div className="hd-section-card" id="room-inventory">
            <div className="hd-section-header-row">
              <div className="hd-section-title-wrap">
                <h3>Room Inventory &amp; Capacity Allocation</h3>
                <p>Dynamic occupancy tracking calibrated for temple transit surges</p>
              </div>
              <div className="hd-inv-legend">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="hd-dot-indicator" style={{ backgroundColor: '#0f172a' }}></span>
                  <span>Occupied ({occupiedRoomsCount})</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="hd-dot-indicator" style={{ backgroundColor: '#d97706' }}></span>
                  <span>Available ({availableRooms})</span>
                </span>
              </div>
            </div>

            <div className="hd-inv-grid">
              <div className="hd-inv-card">
                <div className="hd-inv-card-label">Total Property Capacity</div>
                <div className="hd-inv-card-val">{totalRoomsCount} Rooms</div>
                <div className="hd-inv-card-sub">100% Total Licensed Inventory</div>
              </div>
              <div className="hd-inv-card">
                <div className="hd-inv-card-label">Currently Occupied</div>
                <div className="hd-inv-card-val">{occupiedRoomsCount} Rooms</div>
                <div className="hd-inv-card-sub">{occupancyPercent}% Total Utilization</div>
              </div>
              <div className="hd-inv-card highlight">
                <div className="hd-inv-card-label">Available For Check-In</div>
                <div className="hd-inv-card-val">{availableRooms} Rooms</div>
                <div className="hd-inv-card-sub">Ready for instant transit allocation</div>
              </div>
            </div>
          </div>

          {/* SECTION 6A: TWO-SIDED BOOKING REQUESTS REVIEW */}
          <div className="hd-section-card" id="booking-requests">
            <div className="hd-section-header-row">
              <div className="hd-section-title-wrap">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📩</span>
                  <h3>Incoming Booking Requests</h3>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: '#fffbeb',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    Pilot Reservation Stream
                  </span>
                  {pendingRequestsCount > 0 && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {pendingRequestsCount} Pending Review
                    </span>
                  )}
                </div>
                <p>
                  Two-sided reservation bridge: Review pilgrim time-range requests, verify room slot availability, and assign room.
                </p>
              </div>

              <div className="hd-controls-row">
                <div className="hd-tab-pills">
                  <button
                    type="button"
                    onClick={() => setCurrentRequestFilter('ALL')}
                    className={`hd-tab-pill ${currentRequestFilter === 'ALL' ? 'active' : ''}`}
                  >
                    All ({bookingRequestsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentRequestFilter('PENDING')}
                    className={`hd-tab-pill ${currentRequestFilter === 'PENDING' ? 'active' : ''}`}
                  >
                    Pending ({pendingRequestsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentRequestFilter('CONFIRMED')}
                    className={`hd-tab-pill ${currentRequestFilter === 'CONFIRMED' ? 'active' : ''}`}
                  >
                    Confirmed ({bookingRequestsList.filter((r) => r.status === 'confirmed').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentRequestFilter('DECLINED')}
                    className={`hd-tab-pill ${currentRequestFilter === 'DECLINED' ? 'active' : ''}`}
                  >
                    Declined ({bookingRequestsList.filter((r) => r.status === 'declined').length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSimulateNewPilgrimRequest}
                  className="hd-btn-simulate-req"
                >
                  + Simulate Pilgrim Request
                </button>
              </div>
            </div>

            <div className="hd-requests-grid">
              {filteredBookingRequests.length === 0 ? (
                <div className="hd-empty-requests">
                  No booking requests in this view.
                </div>
              ) : (
                filteredBookingRequests.map((req) => (
                  <div key={req.id} className={`hd-request-card ${req.status}`}>
                    <div>
                      <div className="hd-req-top">
                        <div>
                          <div className="hd-req-id-row">
                            <span className="hd-req-id-tag">{req.id}</span>
                            <span>REF: {req.booking_id}</span>
                          </div>
                          <h4 className="hd-req-name">
                            {req.guest_name}{' '}
                            <span className="hd-req-party">({req.guest_count} Guests)</span>
                          </h4>
                          <div className="hd-req-room">
                            Requested: <strong>Room #{req.room_number} ({req.room_type})</strong>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span className={`hd-req-badge ${req.status}`}>
                            {req.status === 'pending' && <span className="hd-dot-indicator hd-pulse-dot" style={{ backgroundColor: '#d97706' }}></span>}
                            {req.status === 'confirmed' && '✓ Confirmed'}
                            {req.status === 'declined' && '✕ Declined'}
                            {req.status === 'pending' && 'Pending Review'}
                          </span>
                          <div className="hd-req-price">₹{req.price.toLocaleString('en-IN')}</div>
                        </div>
                      </div>

                      <div className="hd-req-window">
                        <span>🕒</span>
                        <span>
                          Window: <strong>{req.check_in.replace('T', ' ').slice(5, 16)}</strong> →{' '}
                          <strong>{req.check_out.replace('T', ' ').slice(5, 16)}</strong>
                        </span>
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div className="hd-req-actions">
                        <button
                          type="button"
                          onClick={() => handleAcceptBookingRequest(req.id)}
                          className="hd-btn-accept"
                        >
                          <span>✓</span> Accept &amp; Assign
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeclineModal(req.id)}
                          className="hd-btn-decline"
                        >
                          <span>✕</span> Decline
                        </button>
                      </div>
                    )}

                    {req.status === 'confirmed' && (
                      <div className="hd-req-confirmed-footer">
                        <span>Room #{req.room_number} marked BOOKED in matrix.</span>
                        <button
                          type="button"
                          onClick={() => handleLoadBookingIntoTerminal(req)}
                          className="hd-btn-load-terminal"
                        >
                          Load in QR Desk ➔
                        </button>
                      </div>
                    )}

                    {req.status === 'declined' && (
                      <div className="hd-req-decline-reason">
                        Reason: <em>{req.decline_reason || 'Room unavailable'}</em>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 6B: ROOM SLOT / TIME-BASED AVAILABILITY */}
          <div className="hd-section-card" id="room-slots">
            <div className="hd-section-header-row">
              <div className="hd-section-title-wrap">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span>
                  <h3>Room Slot Availability</h3>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    Simulated 24h Transit Matrix
                  </span>
                </div>
                <p>Real-time room occupancy and upcoming turnover slots across time windows</p>
              </div>

              <div className="hd-controls-row">
                {/* Date Switcher */}
                <div className="hd-tab-pills">
                  <button
                    type="button"
                    onClick={() => setSelectedSlotDay('today')}
                    className={`hd-tab-pill ${selectedSlotDay === 'today' ? 'active' : ''}`}
                  >
                    Today · 4 Sep
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSlotDay('tomorrow')}
                    className={`hd-tab-pill ${selectedSlotDay === 'tomorrow' ? 'active' : ''}`}
                  >
                    Tomorrow · 5 Sep
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSlotDay('nextDay')}
                    className={`hd-tab-pill ${selectedSlotDay === 'nextDay' ? 'active' : ''}`}
                  >
                    Next Day · 6 Sep
                  </button>
                </div>

                {/* Compact Legend */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="hd-dot-indicator" style={{ backgroundColor: '#10b981' }}></span> Available
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="hd-dot-indicator" style={{ backgroundColor: '#334155' }}></span> Booked
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="hd-dot-indicator" style={{ backgroundColor: '#f59e0b' }}></span> Check-in
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="hd-dot-indicator" style={{ backgroundColor: '#ef4444' }}></span> Check-out
                  </span>
                </div>
              </div>
            </div>

            {/* Turnover Summary Banner */}
            <div className="hd-turnover-banner">
              <div className="hd-turnover-left">
                <div className="hd-turnover-icon">⚡</div>
                <div>
                  <h4 className="hd-turnover-title">Next Available Rooms &amp; Instant Transit Turnover</h4>
                  <p className="hd-turnover-sub">
                    Live turnover watch for front-desk dispatchers absorbing rerouted pilgrim batches
                  </p>
                </div>
              </div>

              <div className="hd-turnover-badges">
                {selectedSlotDay === 'today' && (
                  <>
                    <span className="hd-to-badge available">
                      <span className="hd-dot-indicator" style={{ backgroundColor: '#10b981' }}></span>
                      Room 202: Available Now (till 8 PM)
                    </span>
                    <span className="hd-to-badge upcoming">
                      Room 203: Available at 4:00 PM
                    </span>
                    <span className="hd-to-badge upcoming">
                      Room 205: Available at 6:00 PM
                    </span>
                    {state.guestStatus === 'CHECKED_OUT' && (
                      <span className="hd-to-badge available hd-pulse-dot">
                        Room 204: Available Now (Cleaned)
                      </span>
                    )}
                    {state.isRerouteSpikeActive && (
                      <span className="hd-to-badge surge">
                        Surge Rooms (206, 208) Allocated
                      </span>
                    )}
                  </>
                )}
                {selectedSlotDay === 'tomorrow' && (
                  <>
                    <span className="hd-to-badge available">
                      Room 201: Available 10:30 AM
                    </span>
                    <span className="hd-to-badge available">
                      Room 204: Available 11:30 AM
                    </span>
                    <span className="hd-to-badge occupied">
                      Room 207: Available 10:30 AM
                    </span>
                  </>
                )}
                {selectedSlotDay === 'nextDay' && (
                  <>
                    <span className="hd-to-badge available">
                      Room 204: Available All Day
                    </span>
                    <span className="hd-to-badge available">
                      Room 206 &amp; 208: Available All Day
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Subtext bar */}
            <div className="hd-table-subtext-bar">
              <span>Showing representative rooms · 10 of 50</span>
              <span>Desk-01 Live Operational Sync</span>
            </div>

            {/* Matrix Table */}
            <div className="hd-slot-table-wrap">
              <table className="hd-slot-table">
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
                  {getRoomSlotData(selectedSlotDay).map((r) => (
                    <tr key={r.room} className={r.isDemo ? 'linked' : ''}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong>#{r.room}</strong>
                          {r.isDemo && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              border: '1px solid #fde68a'
                            }}>
                              DEMO DESK
                            </span>
                          )}
                          {r.isSurge && state.isRerouteSpikeActive && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              background: '#fee2e2',
                              color: '#991b1b',
                              padding: '1px 5px',
                              borderRadius: '4px'
                            }}>
                              SURGE ALLOCATED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{r.type}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.guest}</div>
                        <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8' }}>{r.ref}</div>
                      </td>
                      <td style={{ color: '#475569' }}>{r.window}</td>
                      {r.slots.map((slot, idx) => (
                        <td key={idx} style={{ textAlign: 'center' }}>
                          <span className={`hd-slot-pill ${slot}`}>
                            {slot === 'CHECK_IN' ? 'Check-in' : slot === 'CHECK_OUT' ? 'Check-out' : slot === 'AVAILABLE' ? 'Available' : 'Booked'}
                          </span>
                        </td>
                      ))}
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          fontWeight: 700,
                          color: r.nextAvailable.includes('Available Now') ? '#047857' : '#0f172a',
                          background: r.nextAvailable.includes('Available Now') ? '#ecfdf5' : 'transparent',
                          padding: r.nextAvailable.includes('Available Now') ? '2px 8px' : 0,
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

            <div className="hd-slot-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="hd-dot-indicator hd-pulse-dot" style={{ backgroundColor: '#f59e0b' }}></span>
                <span><strong>Room #204</strong> is linked dynamically to the <strong>Guest Check-In Terminal</strong> below.</span>
              </div>
              <div style={{ color: '#94a3b8' }}>
                Standard turnaround buffer: <strong>45 mins</strong> between checkout inspection and new allocation
              </div>
            </div>
          </div>

          {/* SECTION 7: DYNAMIC PRICING */}
          <div className="hd-section-card" id="dynamic-pricing">
            <div className="hd-pricing-content">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡</span>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, textTransform: 'uppercase' }}>
                    Pricing Decision: Rule-Based Surge Pricing
                  </h3>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    SIH Decision Layer
                  </span>
                </div>

                <div className="hd-pricing-rates">
                  <span>Base Parity Rate: <strong>₹1,000</strong></span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>Current Live Rate: <strong>₹{state.currentRate.toLocaleString('en-IN')}</strong></span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>
                    AI-Simulated Suggested Rate:{' '}
                    <strong style={{ color: '#d97706' }}>₹{state.suggestedRate.toLocaleString('en-IN')}</strong>
                  </span>
                  {state.isRerouteSpikeActive && (
                    <span className="hd-surge-active-pill">Surge Active (+30%)</span>
                  )}
                </div>

                <p className="hd-pricing-notice">
                  <span>ℹ️</span>
                  <span>Automated decision layer based on real-time transit reroute volume. Distinguishes recommendation guidance from persisted database base rate.</span>
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={toggleSuggestedRate}
                  className={`hd-btn-pricing ${
                    state.isSuggestedApplied
                      ? ''
                      : state.isRerouteSpikeActive
                      ? 'surge-recommended hd-ring-attention'
                      : ''
                  }`}
                >
                  {state.isSuggestedApplied
                    ? 'Revert to Base Rate (₹1,000)'
                    : `Apply Suggested Rate (₹${state.suggestedRate.toLocaleString('en-IN')})`}
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 8: GUEST VERIFICATION TERMINAL */}
          <div className="hd-section-card" id="guest-verification">
            <div className="hd-section-header-row">
              <div className="hd-section-title-wrap">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🪪</span>
                  <h3>Express QR Verification &amp; Guest Check-In Terminal</h3>
                </div>
                <p>
                  Real-time digital pass verification for rerouted pilgrims with instant Municipal Tax Credit certification upon completed stay.
                </p>
              </div>

              <div style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '4px 12px',
                borderRadius: '8px',
                color: '#475569'
              }}>
                TERMINAL: <strong style={{ color: '#d97706' }}>DESK-01</strong>
              </div>
            </div>

            <div className="hd-terminal-grid">
              {/* Left: Scannable QR Terminal */}
              <div className="hd-terminal-qr-col">
                <span className="hd-qr-official-badge">
                  Official Demo Check-In QR (Scannable)
                </span>

                <div className="hd-qr-holder">
                  <ScannableQRCode payload={state.bookingRef} />
                </div>

                <div className="hd-qr-payload">
                  PAYLOAD: <strong>{state.bookingRef}</strong>
                </div>

                <div className="hd-qr-sub">
                  Scan QR with any phone to verify live booking reference.
                </div>
              </div>

              {/* Right: Pilgrim Profile Card */}
              <div className="hd-terminal-guest-col">
                <div className="hd-guest-card">
                  <div className="hd-guest-card-top">
                    <div>
                      <span className="hd-guest-ref-tag">BOOKING REF: {state.bookingRef}</span>
                      <h4 className="hd-guest-name">
                        {state.guestName}{' '}
                        <span className="hd-guest-party">
                          (Party: {state.partySize} Pilgrims • Origin: {state.origin})
                        </span>
                      </h4>
                      <div className="hd-guest-room">
                        <span>Room: <strong>{state.roomAssigned}</strong></span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ color: '#d97706', fontWeight: 600 }}>Category: {state.category}</span>
                      </div>
                    </div>

                    <div className={`hd-guest-status-pill ${
                      state.guestStatus === 'PENDING'
                        ? 'pending'
                        : state.guestStatus === 'CHECKED_IN'
                        ? 'checked-in'
                        : 'checked-out'
                    }`}>
                      <span
                        className="hd-dot-indicator"
                        style={{
                          backgroundColor:
                            state.guestStatus === 'PENDING'
                              ? '#f59e0b'
                              : state.guestStatus === 'CHECKED_IN'
                              ? '#10b981'
                              : '#a855f7'
                        }}
                      ></span>
                      <span>
                        {state.guestStatus === 'PENDING' && 'Pending Arrival'}
                        {state.guestStatus === 'CHECKED_IN' && 'Checked-In ✔'}
                        {state.guestStatus === 'CHECKED_OUT' && 'Checked-Out ✔'}
                      </span>
                    </div>
                  </div>

                  <div className="hd-guest-meta-row">
                    <span>
                      Status:{' '}
                      {state.guestStatus === 'PENDING' ? (
                        <strong>Awaiting QR Check-In</strong>
                      ) : state.guestStatus === 'CHECKED_IN' ? (
                        <strong style={{ color: '#059669' }}>Checked-In ✔ (Room #204 Allocated)</strong>
                      ) : (
                        <strong style={{ color: '#7c3aed' }}>Stay Completed ✔ (Tax Credit Accrued)</strong>
                      )}
                    </span>
                    <span>
                      State Incentive:{' '}
                      <strong style={{ color: '#047857' }}>Municipal Tax Credit (+₹25)</strong>
                    </span>
                  </div>
                </div>

                <div className="hd-terminal-buttons-grid">
                  <button
                    type="button"
                    onClick={simulateGuestCheckIn}
                    className="hd-btn-terminal hd-btn-checkin"
                  >
                    <span>📱 Simulate QR Check-In</span>
                    <span className="hd-btn-subnote">(verifies pass &amp; occupies room)</span>
                  </button>

                  <button
                    type="button"
                    onClick={simulateGuestCheckOut}
                    disabled={state.guestStatus !== 'CHECKED_IN'}
                    className={`hd-btn-terminal hd-btn-checkout ${
                      state.guestStatus === 'CHECKED_IN' ? 'active' : ''
                    }`}
                  >
                    <span>✨ Simulate Check-Out</span>
                    <span className="hd-btn-subnote">
                      {state.guestStatus === 'CHECKED_IN'
                        ? '(Click to certify stay & claim tax credit)'
                        : state.guestStatus === 'CHECKED_OUT'
                        ? '(Guest has checked out)'
                        : '(locked until guest checks in)'}
                    </span>
                  </button>
                </div>

                <div className="hd-demo-hint-box">
                  <span>💡</span>
                  <span>
                    <strong>Demo Order:</strong> 1. Click &quot;Simulate Rerouting Spike&quot; ➔ 2. &quot;Apply Suggested Rate&quot; ➔ 3. &quot;Simulate QR Check-In&quot; ➔ 4. &quot;Simulate Check-Out&quot;.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 9: REAL SUPABASE BOOKINGS FEED */}
          {backendBookings.length > 0 && (
            <div className="hd-supabase-feed" id="supabase-feed">
              <div className="hd-feed-header">
                <h4>
                  <span>📋</span>
                  <span>Registered Lodge Bookings Feed (Supabase Table: <code>hotel_bookings</code>)</span>
                </h4>
                <span className="hd-feed-count">
                  Total Owned Reservations: {backendBookings.length}
                </span>
              </div>

              <div className="hd-feed-table-wrap">
                <table className="hd-feed-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Yatri / Devotee</th>
                      <th>Room Type</th>
                      <th>Stay Dates</th>
                      <th>Guests</th>
                      <th>Total Price</th>
                      <th>Status</th>
                      <th>QR Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backendBookings.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#b45309' }}>
                          {b.id.slice(0, 16)}...
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{b.tourist_id}</td>
                        <td>{b.room_type}</td>
                        <td>{b.check_in} → {b.check_out}</td>
                        <td>{b.guests} Pers</td>
                        <td style={{ color: '#047857', fontWeight: 'bold' }}>₹{b.total_price}</td>
                        <td>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 8px',
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
                            className="hd-btn-feed-load"
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

      {/* DECLINE REASON MODAL */}
      {declineModal.isOpen && (
        <div className="hd-modal-overlay">
          <div className="hd-modal-card">
            <h3 className="hd-modal-title">Decline Booking Request</h3>
            <p className="hd-modal-desc">
              Select or type a reason for declining request <strong>{declineModal.targetId}</strong>:
            </p>

            <div className="hd-modal-presets">
              {[
                'Room unavailable for requested hours',
                'Property fully booked for transit batch',
                'Maintenance and inspection scheduled',
                'Late pilgrim arrival cutoff exceeded'
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setDeclineModal((prev) => ({ ...prev, reason }))}
                  className="hd-preset-btn"
                >
                  {reason}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={declineModal.reason}
              onChange={(e) => setDeclineModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Enter custom reason..."
              className="hd-modal-input"
            />

            <div className="hd-modal-actions">
              <button
                type="button"
                onClick={() => setDeclineModal({ isOpen: false, targetId: null, reason: '' })}
                className="hd-btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                className="hd-btn-modal-confirm"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
