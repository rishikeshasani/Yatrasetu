import React from 'react';

/**
 * Format date safely into "DD MMM YYYY" (e.g., "11 Sep 2026")
 */
function formatBookingDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Resolve status badge styles and supporting text
 */
function getStatusConfig(rawStatus) {
  const status = (rawStatus || 'PENDING').toUpperCase().trim();

  if (status === 'PENDING' || status === 'PENDING_REVIEW' || status === 'REQUESTED') {
    return {
      label: '⏳ Pending Review',
      textColor: '#92400E',
      bgColor: '#FFFBEB',
      borderColor: '#FDE68A',
      supportingText: 'Waiting for hotel owner approval.'
    };
  }

  if (status === 'CONFIRMED' || status === 'ACCEPTED') {
    return {
      label: '✓ Confirmed',
      textColor: '#065F46',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      supportingText: 'Your accommodation is confirmed.'
    };
  }

  if (status === 'DECLINED' || status === 'REJECTED') {
    return {
      label: '✕ Declined',
      textColor: '#991B1B',
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
      supportingText: 'The hotel did not approve this request.'
    };
  }

  if (status === 'CANCELLED') {
    return {
      label: '✕ Cancelled',
      textColor: '#475569',
      bgColor: '#F1F5F9',
      borderColor: '#CBD5E1',
      supportingText: 'This booking was cancelled.'
    };
  }

  if (status === 'CHECKED_IN' || status === 'COMPLETED') {
    return {
      label: '✓ Completed',
      textColor: '#1E40AF',
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
      supportingText: 'Stay completed at accommodation.'
    };
  }

  return {
    label: rawStatus || 'Updated',
    textColor: '#334155',
    bgColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    supportingText: `Status: ${rawStatus}`
  };
}

export default function BookingCard({ booking }) {
  if (!booking) return null;

  const statusCfg = getStatusConfig(booking.status);
  const bookingRef = booking.booking_id || booking.id || 'N/A';
  const hotelName = booking.hotel_name || 'Shrine Pilgrimage Lodge';

  // Room / Type resolution
  let roomTypeDisplay = 'Standard Yatri Room';
  if (booking.room_number && booking.room_type) {
    roomTypeDisplay = `#${booking.room_number} • ${booking.room_type}`;
  } else if (booking.room_type) {
    roomTypeDisplay = booking.room_type.toLowerCase().includes('room')
      ? booking.room_type
      : `${booking.room_type} Room`;
  } else if (booking.room_number) {
    roomTypeDisplay = `Room #${booking.room_number}`;
  }

  // Check-in and check-out dates
  const checkInFormatted = formatBookingDate(booking.check_in_datetime || booking.check_in);
  const checkOutFormatted = formatBookingDate(booking.check_out_datetime || booking.check_out);

  // Amount in Indian format
  const rawAmount = booking.total_price !== undefined && booking.total_price !== null
    ? booking.total_price
    : (booking.price !== undefined && booking.price !== null ? booking.price : (booking.total_amount || 0));
  const amountFormatted = `₹${Number(rawAmount || 0).toLocaleString('en-IN')}`;

  return (
    <div
      className="booking-card"
      style={{
        background: '#FFFFFF',
        borderRadius: '0.85rem',
        border: '1px solid #E2E8F0',
        padding: '1.2rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.85rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      {/* 1. Header: Accommodation Name & Status Badge */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <h4 style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: '800',
            color: '#0F172A',
            lineHeight: 1.3
          }}>
            {hotelName}
          </h4>
          <div style={{
            fontSize: '0.78rem',
            color: '#64748B',
            marginTop: '0.2rem',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            overflowWrap: 'anywhere',
            lineHeight: 1.4
          }}>
            Booking: {bookingRef}
          </div>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '800',
            color: statusCfg.textColor,
            backgroundColor: statusCfg.bgColor,
            border: `1px solid ${statusCfg.borderColor}`,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* 2. Room / Type & Dates */}
      <div style={{
        paddingTop: '0.25rem',
        borderTop: '1px solid #F1F5F9',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem'
      }}>
        <div style={{
          fontSize: '0.85rem',
          fontWeight: '700',
          color: '#334155'
        }}>
          {roomTypeDisplay}
        </div>
        <div style={{
          fontSize: '0.8rem',
          color: '#64748B',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          flexWrap: 'wrap'
        }}>
          <span>📅</span>
          <span>{checkInFormatted}</span>
          <span style={{ color: '#94A3B8' }}>→</span>
          <span>{checkOutFormatted}</span>
        </div>
      </div>

      {/* 3. Amount & Supporting Text */}
      <div style={{
        paddingTop: '0.35rem',
        borderTop: '1px solid #F1F5F9',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      }}>
        <div style={{
          fontSize: '1.15rem',
          fontWeight: '900',
          color: '#0F172A',
          letterSpacing: '-0.02em'
        }}>
          {amountFormatted}
        </div>
        <div style={{
          fontSize: '0.78rem',
          fontWeight: '600',
          color: statusCfg.textColor,
          lineHeight: 1.3
        }}>
          {statusCfg.supportingText}
        </div>
      </div>
    </div>
  );
}
