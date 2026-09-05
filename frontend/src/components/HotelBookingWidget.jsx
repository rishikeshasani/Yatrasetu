import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchHotelRooms,
  calculateDynamicPrice,
  checkHotelRoomAvailability,
  createBookingRequest,
  fetchUserBookingRequests,
  cancelBookingRequest,
  subscribeToHotelUpdates
} from '../api/api';
import './HotelBookingWidget.css';

export default function HotelBookingWidget({ currentUser, onShowToast }) {
  // 1. Hotel & Room state
  const [hotelId, setHotelId] = useState('H001');
  const [allRooms, setAllRooms] = useState([]);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('204');
  const [guestName, setGuestName] = useState(currentUser?.name || 'Anita Sharma');
  const [guests, setGuests] = useState(2);
  const [specialRequest, setSpecialRequest] = useState('');

  // 2. Datetime state
  const [checkInDate, setCheckInDate] = useState('2026-09-05');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutDate, setCheckOutDate] = useState('2026-09-07');
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  // 2B. Dynamic Hourly Pricing state
  const [livePricing, setLivePricing] = useState({
    duration_hours: 21,
    base_hourly_rate: 50,
    pricing_multiplier: 1.5,
    dynamic_hourly_rate: 75,
    total_amount: 1575,
    crowd_percentage: 87,
    crowd_level: 'HIGH',
    price_adjustment_pct: '+50%'
  });

  // 3. Availability verification state
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isRoomAvailable, setIsRoomAvailable] = useState(null); // true | false | null
  const [availableRoomsList, setAvailableRoomsList] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  // 4. Request Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestBanner, setRequestBanner] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);

  // 5. User Booking Requests List & Tracker
  const [myRequests, setMyRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PENDING' | 'CONFIRMED' | 'DECLINED'

  // Load all rooms on mount
  useEffect(() => {
    let isMounted = true;
    async function loadRooms() {
      try {
        const rooms = await fetchHotelRooms(hotelId);
        if (isMounted && Array.isArray(rooms) && rooms.length > 0) {
          setAllRooms(rooms);
          if (!selectedRoomNumber) {
            setSelectedRoomNumber(String(rooms[0].room_number));
          }
        }
      } catch (e) {
        console.warn('Error loading rooms:', e);
      }
    }
    loadRooms();
    return () => { isMounted = false; };
  }, [hotelId]);

  // Load user booking requests
  const loadRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const data = await fetchUserBookingRequests(guestName);
      setMyRequests(data || []);
    } catch (err) {
      console.warn('Error loading user requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [guestName]);

  // Initial load & subscription + polling
  useEffect(() => {
    loadRequests();

    // Cross-tab broadcast subscription
    const unsubscribe = subscribeToHotelUpdates((event) => {
      loadRequests();
      checkCurrentRoomAvailability();
      if (event.type === 'REQUEST_ACCEPTED') {
        if (onShowToast) {
          onShowToast(`🎉 Booking Confirmed! Room ${event.request?.room_number} allocated by Hotel Ganga Heritage.`);
        }
      } else if (event.type === 'REQUEST_DECLINED') {
        if (onShowToast) {
          onShowToast(`ℹ️ Booking Request for Room ${event.request?.room_number} was declined: ${event.request?.decline_reason || 'Unavailable'}`);
        }
      }
    });

    // 3-second heartbeat polling so tourist sees status changes immediately
    const pollInterval = setInterval(() => {
      loadRequests();
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [loadRequests]);

  // Format Helper for timestamps
  const getIsoTimestamps = () => {
    const inIso = `${checkInDate}T${checkInTime}:00`;
    const outIso = `${checkOutDate}T${checkOutTime}:00`;
    return { inIso, outIso };
  };

  // Check availability for current selected room and all rooms in interval
  const checkCurrentRoomAvailability = useCallback(async () => {
    const { inIso, outIso } = getIsoTimestamps();
    if (new Date(inIso) >= new Date(outIso)) {
      setIsRoomAvailable(false);
      setAvailabilityMessage('Check-in time must be before check-out time.');
      return;
    }

    setIsCheckingAvailability(true);
    setSubmissionError(null);
    try {
      const available = await checkHotelRoomAvailability({
        hotelId,
        checkIn: inIso,
        checkOut: outIso,
        guests,
        roomType: categoryFilter === 'ALL' ? null : categoryFilter
      });

      setAvailableRoomsList(available || []);

      // Check if specifically selected room is available
      const match = (available || []).find(r => String(r.room_number) === String(selectedRoomNumber));
      if (match) {
        setIsRoomAvailable(true);
        setAvailabilityMessage(`Room ${selectedRoomNumber} is Available ✓`);
      } else {
        setIsRoomAvailable(false);
        setAvailabilityMessage(`Room ${selectedRoomNumber} is NOT available for this time range (Conflict with existing reservation)`);
      }
    } catch (err) {
      console.warn('Error checking availability:', err);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [hotelId, checkInDate, checkInTime, checkOutDate, checkOutTime, guests, categoryFilter, selectedRoomNumber]);

  // Find selected room metadata
  const selectedRoomObj = allRooms.find(r => String(r.room_number) === String(selectedRoomNumber)) || {
    room_number: selectedRoomNumber,
    room_type: 'Deluxe',
    floor: 2,
    capacity: 3,
    price_per_night: 1300.0
  };

  // Auto-check availability and calculate live dynamic hourly pricing
  useEffect(() => {
    checkCurrentRoomAvailability();

    let isMounted = true;
    const { inIso, outIso } = getIsoTimestamps();
    if (new Date(inIso) < new Date(outIso)) {
      calculateDynamicPrice({
        hotelId,
        checkIn: inIso,
        checkOut: outIso,
        roomType: selectedRoomObj.room_type || 'Deluxe',
        roomNumber: selectedRoomNumber
      }).then(p => {
        if (isMounted && p) setLivePricing(p);
      }).catch(() => {});
    }

    return () => { isMounted = false; };
  }, [checkCurrentRoomAvailability, hotelId, checkInDate, checkInTime, checkOutDate, checkOutTime, selectedRoomObj.room_type, selectedRoomNumber]);

  // Send Booking Request to Hotel Owner
  const handleSendBookingRequest = async (e) => {
    if (e) e.preventDefault();
    setSubmissionError(null);

    if (!guestName.trim()) {
      setSubmissionError('Please enter the Pilgrim/Guest Name.');
      return;
    }

    const { inIso, outIso } = getIsoTimestamps();
    if (new Date(inIso) >= new Date(outIso)) {
      setSubmissionError('Check-in time must be strictly before check-out time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        hotel_id: hotelId,
        tourist_id: 'T001',
        room_id: selectedRoomObj.room_id || `R${selectedRoomNumber}`,
        room_number: String(selectedRoomNumber),
        room_type: selectedRoomObj.room_type || 'Deluxe',
        guest_name: guestName.trim(),
        guest_count: Number(guests) || 2,
        check_in_datetime: inIso,
        check_out_datetime: outIso,
        check_in: inIso,
        check_out: outIso,
        special_request: specialRequest.trim(),
        price: livePricing.total_amount || 1575.0,
        pricing_multiplier: livePricing.pricing_multiplier || 1.5
      };

      const result = await createBookingRequest(payload);

      // Display "REQUEST SENT: Waiting for hotel confirmation"
      setRequestBanner({
        id: result.id,
        booking_id: result.booking_id,
        room_number: result.room_number,
        room_type: result.room_type,
        status: result.status,
        check_in: result.check_in,
        check_out: result.check_out,
        special_request: result.special_request
      });

      if (onShowToast) {
        onShowToast(`📩 Booking Request Sent for Room #${result.room_number}! Waiting for hotel confirmation.`);
      }

      await loadRequests();
      checkCurrentRoomAvailability();
    } catch (err) {
      setSubmissionError(err.message || 'Failed to submit booking request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Request
  const handleCancel = async (requestId) => {
    if (!window.confirm('Cancel this booking request?')) return;
    try {
      await cancelBookingRequest(requestId);
      if (onShowToast) onShowToast('Booking request cancelled.');
      await loadRequests();
      checkCurrentRoomAvailability();
    } catch (err) {
      alert(err.message || 'Failed to cancel.');
    }
  };

  // Filter requests
  const filteredRequests = myRequests.filter((r) => {
    if (activeTab === 'PENDING') return r.status === 'pending';
    if (activeTab === 'CONFIRMED') return r.status === 'confirmed';
    if (activeTab === 'DECLINED') return r.status === 'declined';
    return true;
  });

  const pendingCount = myRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="hotel-booking-widget-wrapper" id="pilgrim-hotel-booking">
      {/* 1. Header Banner */}
      <div className="widget-header">
        <div className="widget-header-left">
          <div className="widget-header-badge">
            <span className="partner-icon">🏨</span>
            <span>TEMPLE CORRIDOR TRANSIT ACCOMMODATION</span>
          </div>
          <h2 className="widget-title">Exact Room &amp; Time-Slot Booking Request</h2>
          <p className="widget-subtitle">
            Direct two-sided reservation bridge connecting pilgrims with verified temple corridor partner lodges.
          </p>
        </div>

        <div className="widget-header-right">
          <div className="hotel-info-pill">
            <div className="hotel-dot-pulse"></div>
            <div>
              <div className="hotel-pill-name">Hotel Ganga Heritage</div>
              <div className="hotel-pill-meta">Kashi Corridor (Zone B-2) • 50 Verified Rooms</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Success/Pending Submission Banner */}
      {requestBanner && (
        <div className="booking-sent-banner">
          <div className="sent-banner-icon">📩</div>
          <div className="sent-banner-content">
            <div className="sent-banner-title-row">
              <span className="sent-banner-title">REQUEST SENT — Waiting for hotel confirmation</span>
              <span className="sent-badge-pending">Status: PENDING</span>
            </div>
            <p className="sent-banner-desc">
              Your booking request for <strong>Room #{requestBanner.room_number} ({requestBanner.room_type})</strong> with Booking ID <strong>{requestBanner.booking_id}</strong> has been transmitted to Hotel Ganga Heritage.
              The hotel partner will review exact room availability before confirming.
            </p>
            <div className="sent-banner-meta">
              <span>🕒 Window: <strong>{requestBanner.check_in?.replace('T', ' ').slice(0, 16)} → {requestBanner.check_out?.replace('T', ' ').slice(0, 16)}</strong></span>
              {requestBanner.special_request && (
                <span>&nbsp;• Special Request: <em>"{requestBanner.special_request}"</em></span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="sent-banner-dismiss"
            onClick={() => setRequestBanner(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Section 13: Exact Room & Datetime Booking Form */}
      <div className="booking-search-card">
        <form onSubmit={handleSendBookingRequest} className="booking-search-form">
          <div className="search-fields-grid">
            {/* Hotel Selector */}
            <div className="search-field-group">
              <label className="field-label">1. Hotel</label>
              <select
                value={hotelId}
                onChange={(e) => setHotelId(e.target.value)}
                className="field-select"
              >
                <option value="H001">Hotel Ganga Heritage (Kashi Corridor Zone B-2)</option>
              </select>
            </div>

            {/* Exact Room Selector */}
            <div className="search-field-group">
              <label className="field-label">2. Select Exact Room</label>
              <select
                value={selectedRoomNumber}
                onChange={(e) => setSelectedRoomNumber(e.target.value)}
                className="field-select highlight-select"
              >
                {allRooms.map((r) => (
                  <option key={r.room_id || r.room_number} value={r.room_number}>
                    Room {r.room_number} — {r.room_type} (Floor {r.floor}, ₹{r.room_type === 'Standard' ? 1000 : (r.room_type === 'Deluxe' ? 1300 : 1600)}/night)
                  </option>
                ))}
              </select>
            </div>

            {/* Pilgrim / Guest Name */}
            <div className="search-field-group">
              <label className="field-label">3. Pilgrim / Guest Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Anita Sharma"
                className="field-input"
                required
              />
            </div>

            {/* Check-In Date & Time */}
            <div className="search-field-group">
              <label className="field-label">4. Check-In Date &amp; Time</label>
              <div className="datetime-split">
                <input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="field-input"
                  min="2026-09-04"
                  max="2026-09-10"
                  required
                />
                <select
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="field-select time-select"
                >
                  <option value="08:00">08:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="18:00">06:00 PM</option>
                  <option value="20:00">08:00 PM</option>
                </select>
              </div>
            </div>

            {/* Check-Out Date & Time */}
            <div className="search-field-group">
              <label className="field-label">5. Check-Out Date &amp; Time</label>
              <div className="datetime-split">
                <input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="field-input"
                  min="2026-09-04"
                  max="2026-09-10"
                  required
                />
                <select
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="field-select time-select"
                >
                  <option value="08:00">08:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="18:00">06:00 PM</option>
                  <option value="20:00">08:00 PM</option>
                </select>
              </div>
            </div>

            {/* Guests Count */}
            <div className="search-field-group guests-group">
              <label className="field-label">6. Guests</label>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="field-select"
              >
                <option value={1}>1 Guest</option>
                <option value={2}>2 Guests</option>
                <option value={3}>3 Guests</option>
                <option value={4}>4 Guests</option>
                <option value={5}>5 Guests</option>
              </select>
            </div>

            {/* Special Request */}
            <div className="search-field-group special-req-group">
              <label className="field-label">7. Special Request (Optional)</label>
              <input
                type="text"
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder="e.g. Near elevator, ground floor, temple view..."
                className="field-input"
              />
            </div>
          </div>

          {/* Real-time Room Availability Verification Indicator Box */}
          <div className={`room-live-status-box ${isRoomAvailable ? 'status-ok' : 'status-busy'}`}>
            <div className="status-box-header">
              <div className="status-box-title">
                <span className="room-title-highlight">Room {selectedRoomNumber}</span>
                <span className="room-type-tag">({selectedRoomObj.room_type} • Floor {selectedRoomObj.floor})</span>
              </div>
              <div className="status-badge-indicator">
                {isCheckingAvailability ? (
                  <span className="badge-checking">Checking Availability...</span>
                ) : isRoomAvailable ? (
                  <span className="badge-available">Available ✓</span>
                ) : (
                  <span className="badge-unavailable">✕ Unavailable (Conflict Detected)</span>
                )}
              </div>
            </div>

            <div className="status-box-details">
              <div className="status-detail-item">
                <span className="detail-label">Requested Time Range:</span>
                <strong className="detail-val">
                  {checkInDate} {checkInTime} → {checkOutDate} {checkOutTime} ({livePricing.duration_hours}h)
                </strong>
              </div>
              <div className="status-detail-item">
                <span className="detail-label">Dynamic Hourly Rate:</span>
                <strong className="detail-val price-val">
                  ₹{livePricing.dynamic_hourly_rate} / hour
                  {livePricing.pricing_multiplier > 1.0 && (
                    <span style={{ fontSize: '11px', color: '#d97706', marginLeft: '4px' }}>
                      ({livePricing.pricing_multiplier}× demand)
                    </span>
                  )}
                </strong>
              </div>
              <div className="status-detail-item">
                <span className="detail-label">Total Booking Price:</span>
                <strong className="detail-val price-val" style={{ color: '#059669', fontSize: '15px' }}>
                  ₹{livePricing.total_amount?.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            {availabilityMessage && (
              <div className={`status-note ${isRoomAvailable ? 'note-avail' : 'note-busy'}`}>
                {availabilityMessage}
              </div>
            )}
          </div>

          {submissionError && <div className="submission-error-msg">⚠️ {submissionError}</div>}

          {/* Action Row */}
          <div className="form-submit-row">
            <button
              type="submit"
              disabled={isSubmitting || !isRoomAvailable}
              className="send-request-btn"
            >
              {isSubmitting ? (
                <span>Transmitting Request...</span>
              ) : (
                <>
                  <span>📩 SEND BOOKING REQUEST</span>
                  <span className="btn-arrow">➔</span>
                </>
              )}
            </button>
            <div className="submit-hint">
              {isRoomAvailable
                ? "Your request will be submitted to the hotel owner for confirmation."
                : "Select an alternate time or room to proceed with request."}
            </div>
          </div>
        </form>
      </div>

      {/* 4. Section 13: My Booking Requests Tracker */}
      <div className="my-requests-section">
        <div className="requests-header-row">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="section-title">My Booking Requests</h3>
              {pendingCount > 0 && (
                <span className="pending-badge-counter">{pendingCount} Waiting for Hotel</span>
              )}
            </div>
            <p className="section-desc">
              Live status updates as hotel partner reviews, confirms, or declines your reservation.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="status-tabs-row">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`status-tab ${activeTab === 'ALL' ? 'active' : ''}`}
            >
              All ({myRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              className={`status-tab ${activeTab === 'PENDING' ? 'active' : ''}`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CONFIRMED')}
              className={`status-tab ${activeTab === 'CONFIRMED' ? 'active' : ''}`}
            >
              Confirmed ({myRequests.filter((r) => r.status === 'confirmed').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DECLINED')}
              className={`status-tab ${activeTab === 'DECLINED' ? 'active' : ''}`}
            >
              Declined ({myRequests.filter((r) => r.status === 'declined').length})
            </button>
          </div>
        </div>

        {isLoadingRequests && myRequests.length === 0 ? (
          <div className="loading-requests-box">Loading your booking requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="no-requests-box">
            <span>📋</span> No booking requests found in this filter.
          </div>
        ) : (
          <div className="requests-cards-stack">
            {filteredRequests.map((req) => (
              <div key={req.id || req.booking_id} className={`request-item-card status-${req.status}`}>
                <div className="req-item-top">
                  <div className="req-item-titles">
                    <div className="req-id-badge">
                      <span>REQ ID: <strong>{req.id}</strong></span>
                      <span className="req-booking-ref">BOOKING ID: <strong>{req.booking_id}</strong></span>
                    </div>
                    <h4 className="req-guest-name">
                      {req.guest_name}
                      <span className="req-party-size">({req.guest_count} Guests)</span>
                    </h4>
                    <div className="req-room-summary">
                      Hotel: <strong>Hotel Ganga Heritage</strong> • Room: <strong className="room-highlight">Room #{req.room_number} ({req.room_type})</strong>
                    </div>
                  </div>

                  <div className="req-item-status-col">
                    {req.status === 'pending' && (
                      <div className="status-pill status-pending" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="status-dot animate-pulse"></span>
                          BOOKING REQUEST SENT
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#d97706' }}>
                          Status: PENDING HOTEL APPROVAL
                        </span>
                      </div>
                    )}
                    {req.status === 'confirmed' && (
                      <div className="status-pill status-confirmed" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, fontSize: '12.5px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="status-dot"></span>
                          ROOM BOOKING CONFIRMED ✓
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#166534' }}>
                          Status: CONFIRMED
                        </span>
                      </div>
                    )}
                    {req.status === 'declined' && (
                      <div className="status-pill status-declined" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, fontSize: '12.5px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="status-dot"></span>
                          ROOM BOOKING DECLINED ✕
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#991b1b' }}>
                          Status: DECLINED
                        </span>
                      </div>
                    )}
                    {req.status === 'cancelled' && (
                      <span className="status-pill status-cancelled">
                        CANCELLED
                      </span>
                    )}

                    <div className="req-price-display" style={{ marginTop: '4px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669' }}>
                        ₹{(req.total_price || req.total_amount || req.price)?.toLocaleString('en-IN')} total
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                        ₹{req.final_hourly_rate || req.dynamic_hourly_rate || 75}/hour · {req.duration_hours || 21} hours
                      </div>
                    </div>
                  </div>
                </div>

                <div className="req-item-details-row">
                  <div className="req-time-range">
                    <span className="time-label">Stay Window:</span>
                    <strong className="time-val">
                      {req.check_in?.replace('T', ' ').slice(0, 16)} → {req.check_out?.replace('T', ' ').slice(0, 16)} ({req.duration_hours || 21} hours)
                    </strong>
                  </div>

                  {req.special_request && (
                    <div className="req-special-note">
                      Special Request: <em>"{req.special_request}"</em>
                    </div>
                  )}

                  {req.decline_reason && (
                    <div className="req-decline-reason">
                      Decline Reason: <strong>{req.decline_reason}</strong>
                    </div>
                  )}

                  <div className="req-actions">
                    {req.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleCancel(req.id)}
                        className="req-cancel-btn"
                      >
                        Cancel Request
                      </button>
                    )}
                    {req.status === 'confirmed' && (
                      <div className="req-confirmed-hint">
                        🪪 Ready for Reception Check-in with Booking ID {req.booking_id}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Interactive Available Rooms Grid */}
      <div className="available-rooms-section">
        <div className="rooms-section-header">
          <div className="section-title-wrap">
            <h3 className="section-title">
              Available Rooms for {checkInDate} {checkInTime} → {checkOutDate} {checkOutTime}
            </h3>
            <span className="results-count-pill">
              {availableRoomsList.length} Rooms Conflict-Free
            </span>
          </div>
          <div className="category-filter-pills">
            {['ALL', 'Deluxe', 'Standard', 'Family'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`filter-pill ${categoryFilter === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {availableRoomsList.length === 0 ? (
          <div className="no-rooms-card">
            <div className="no-rooms-icon">🛏️</div>
            <h4>No Rooms Available for the Selected Time Window</h4>
            <p>All rooms of this category are occupied during this window. Adjust your check-in time or check out date.</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {availableRoomsList.slice(0, 12).map((room) => {
              const isCurrentSelected = String(room.room_number) === String(selectedRoomNumber);
              return (
                <div
                  key={room.room_id || room.room_number}
                  className={`room-card ${isCurrentSelected ? 'selected-card' : ''}`}
                  onClick={() => setSelectedRoomNumber(String(room.room_number))}
                >
                  <div className="room-card-header">
                    <div>
                      <div className="room-number">Room #{room.room_number}</div>
                      <div className="room-type-badge">{room.room_type} Room</div>
                    </div>
                    <div className="room-price-box">
                      <span className="price-currency">₹</span>
                      <span className="price-amount">{room.price_per_night}</span>
                      <span className="price-unit">/ night</span>
                    </div>
                  </div>

                  <div className="room-card-body">
                    <div className="room-meta-row">
                      <span>📍 Floor {room.floor}</span>
                      <span>👥 Max {room.capacity}</span>
                      <span className="status-avail-badge">● Available</span>
                    </div>
                  </div>

                  <div className="room-card-footer">
                    <button
                      type="button"
                      className={`select-room-card-btn ${isCurrentSelected ? 'active-select' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRoomNumber(String(room.room_number));
                      }}
                    >
                      {isCurrentSelected ? '✓ Selected Room' : 'Select This Room'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
