import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Helper to format Date to 'YYYY-MM-DDTHH:mm' for datetime-local input
const formatForDatetimeInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
};

// Helper for formatted display
const formatDateTimeDisplay = (isoStr) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${mins}`;
  } catch {
    return isoStr;
  }
};

export default function HotelBookingModal({
  isOpen,
  hotel,
  onClose,
  onConfirmBooking,
  currentUser
}) {
  const { t } = useTranslation();

  // Initial date defaults: tomorrow 12:00 PM to day-after-tomorrow 11:00 AM
  const getInitialDates = () => {
    const today = new Date();
    const inDate = new Date(today);
    inDate.setDate(inDate.getDate() + 1);
    inDate.setHours(12, 0, 0, 0);

    const outDate = new Date(today);
    outDate.setDate(outDate.getDate() + 2);
    outDate.setHours(11, 0, 0, 0);

    return {
      checkIn: formatForDatetimeInput(inDate),
      checkOut: formatForDatetimeInput(outDate)
    };
  };

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset and prefill form on hotel change or modal open
  useEffect(() => {
    if (isOpen && hotel) {
      const dates = getInitialDates();
      setCheckIn(dates.checkIn);
      setCheckOut(dates.checkOut);

      let defaultName = 'Pilgrim Devotee';
      try {
        const storedUser = JSON.parse(localStorage.getItem('yatrasetu_user') || '{}');
        defaultName = currentUser?.full_name || storedUser.full_name || storedUser.name || 'Pilgrim Devotee';
      } catch (e) {
        defaultName = currentUser?.full_name || 'Pilgrim Devotee';
      }
      setGuestName(defaultName);
      setGuestCount(2);
      setSpecialRequest('');
      setErrorMsg('');

      const rooms = hotel.rooms || [];
      const firstAvail = rooms.find((r) => r.available_rooms > 0) || rooms[0];
      setSelectedRoomId(firstAvail?.id || 'default');
    }
  }, [isOpen, hotel, currentUser]);

  if (!isOpen || !hotel) return null;

  const rooms = hotel.rooms || [];
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0] || {
    id: 'default',
    room_number: 101,
    room_type: 'Deluxe Yatri Room',
    price_per_night: hotel.price_per_night || 1200
  };

  // Calculate duration and pricing
  let durationHours = 24;
  let durationNights = 1;
  let isValidDateRange = true;

  if (checkIn && checkOut) {
    const inTime = new Date(checkIn).getTime();
    const outTime = new Date(checkOut).getTime();
    if (outTime <= inTime) {
      isValidDateRange = false;
    } else {
      const diffHours = (outTime - inTime) / (1000 * 60 * 60);
      durationHours = Math.max(1, Math.round(diffHours * 10) / 10);
      durationNights = Math.max(1, Math.ceil(diffHours / 24));
    }
  }

  const pricePerNight = selectedRoom.price_per_night || hotel.price_per_night || 1200;
  const totalPrice = Math.round(pricePerNight * durationNights);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValidDateRange) {
      setErrorMsg('Check-out date/time must be strictly after Check-in date/time.');
      return;
    }

    if (!guestName.trim()) {
      setErrorMsg('Please provide the primary pilgrim guest name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const inIso = new Date(checkIn).toISOString();
      const outIso = new Date(checkOut).toISOString();

      const bookingPayload = {
        hotel_id: hotel.id || 'H001',
        tourist_id: currentUser?.id || 'T001',
        room_id: selectedRoom.id || `R${selectedRoom.room_number || 101}`,
        room_number: String(selectedRoom.room_number || 101),
        room_type: selectedRoom.room_type || 'Deluxe Room',
        guest_name: guestName.trim(),
        guest_count: Number(guestCount) || 2,
        check_in_datetime: inIso,
        check_out_datetime: outIso,
        check_in: inIso,
        check_out: outIso,
        special_request: specialRequest.trim(),
        duration_hours: durationHours,
        price: totalPrice,
        pricing_multiplier: 1.5
      };

      await onConfirmBooking(bookingPayload);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit reservation request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '1.25rem',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
          padding: '1.4rem 1.6rem',
          borderTopLeftRadius: '1.25rem',
          borderTopRightRadius: '1.25rem',
          color: '#FFFFFF',
          position: 'relative'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.1rem',
              right: '1.1rem',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '999px',
              width: '32px',
              height: '32px',
              color: '#FFFFFF',
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.4rem' }}>
            <span>🏨</span>
            <span>SHRINE LODGE RESERVATION</span>
          </div>

          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
            {hotel.name}
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#D1FAE5' }}>
            📍 {hotel.address || 'Near Sanctum Sanctorum'} • ★ {hotel.rating || '4.8'} Verified Yatra Partner
          </p>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {errorMsg && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '0.65rem',
              padding: '0.75rem 1rem',
              color: '#991B1B',
              fontSize: '0.82rem',
              fontWeight: '600',
              marginBottom: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Date & Time Selection Box */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '0.85rem',
            padding: '1.1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📅</span>
              <span>CHOOSE PILGRIMAGE STAY DATES &amp; TIME</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                  Check-in Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={checkIn}
                  min={formatForDatetimeInput(new Date())}
                  onChange={(e) => setCheckIn(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.65rem',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '0.55rem',
                    fontSize: '0.82rem',
                    color: '#0F172A',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                  Check-out Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={checkOut}
                  min={checkIn || formatForDatetimeInput(new Date())}
                  onChange={(e) => setCheckOut(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.65rem',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '0.55rem',
                    fontSize: '0.82rem',
                    color: '#0F172A',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Date verification snippet */}
            {checkIn && checkOut && isValidDateRange && (
              <div style={{
                marginTop: '0.85rem',
                paddingTop: '0.75rem',
                borderTop: '1px dashed #CBD5E1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem'
              }}>
                <span style={{ color: '#047857', fontWeight: '700' }}>
                  ⏳ Stay Duration: {durationNights} Night{durationNights > 1 ? 's' : ''} ({durationHours} Hours)
                </span>
                <span style={{ color: '#475569' }}>
                  {formatDateTimeDisplay(checkIn)} → {formatDateTimeDisplay(checkOut)}
                </span>
              </div>
            )}
          </div>

          {/* Room Selection & Guest Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.85rem', marginBottom: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                Select Room Type
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.65rem',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '0.55rem',
                  fontSize: '0.82rem',
                  color: '#0F172A',
                  fontWeight: '600',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                {rooms.length > 0 ? (
                  rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.room_type} (₹{r.price_per_night}/night) - {r.available_rooms > 0 ? `${r.available_rooms} Left` : 'Limited'}
                    </option>
                  ))
                ) : (
                  <option value="default">Standard Yatri Room (₹{hotel.price_per_night || 1200}/night)</option>
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
                Devotees / Guests
              </label>
              <select
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.65rem',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '0.55rem',
                  fontSize: '0.82rem',
                  color: '#0F172A',
                  fontWeight: '600',
                  background: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value={1}>1 Devotee</option>
                <option value={2}>2 Devotees</option>
                <option value={3}>3 Devotees</option>
                <option value={4}>4 Devotees (Family)</option>
                <option value={5}>5+ Devotees (Group)</option>
              </select>
            </div>
          </div>

          {/* Pilgrim Guest Name */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
              Primary Pilgrim Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Saatvik Sharma"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                border: '1.5px solid #CBD5E1',
                borderRadius: '0.55rem',
                fontSize: '0.82rem',
                color: '#0F172A',
                fontWeight: '600',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Special Requests */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.3rem' }}>
              Special Request / Darshan Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Senior citizen yatri, ground floor preferred, late check-in"
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                border: '1.5px solid #CBD5E1',
                borderRadius: '0.55rem',
                fontSize: '0.82rem',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Estimated Pricing Summary Card */}
          <div style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '0.85rem',
            padding: '1rem 1.15rem',
            marginBottom: '1.4rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#047857', letterSpacing: '0.04em' }}>
                ESTIMATED PAYABLE AT LODGE
              </span>
              <div style={{ fontSize: '0.78rem', color: '#065F46', marginTop: '0.15rem' }}>
                ₹{pricePerNight} × {durationNights} Night{durationNights > 1 ? 's' : ''} ({durationHours} hrs stay)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: '900', color: '#065F46' }}>
                ₹{totalPrice}
              </span>
              <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600' }}>
                Includes all taxes
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: '#F1F5F9',
                color: '#475569',
                border: '1px solid #CBD5E1',
                padding: '0.65rem 1.25rem',
                borderRadius: '0.65rem',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {t('common.cancel')}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !isValidDateRange}
              style={{
                background: isSubmitting ? '#9CA3AF' : '#059669',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.65rem 1.45rem',
                borderRadius: '0.65rem',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              {isSubmitting ? (
                <>
                  <span>⏳</span>
                  <span>Transmitting Request...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>{t('common.confirm')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
