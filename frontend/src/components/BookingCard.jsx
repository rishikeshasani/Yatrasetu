import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import StatusBadge from './common/StatusBadge';

/**
 * Format raw UUID into clean human-readable reference (e.g. "YS-4821A9")
 * Preserves raw UUID in title and detail modal.
 */
function formatHumanRef(ref) {
  if (!ref) return 'YS-0000';
  const s = String(ref).trim();
  if (s.startsWith('YS-') || s.startsWith('BK-')) return s;
  const clean = s.replace(/-/g, '');
  const slice = clean.length > 6 ? clean.slice(-6).toUpperCase() : clean.toUpperCase();
  return `YS-${slice}`;
}

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
function getStatusConfig(rawStatus, t) {
  const status = (rawStatus || 'PENDING').toUpperCase().trim();

  if (status === 'PENDING' || status === 'PENDING_REVIEW' || status === 'REQUESTED') {
    return {
      label: `⏳ ${t ? t('bookings.statusPending', 'Pending Review') : 'Pending Review'}`,
      textColor: '#92400E',
      bgColor: '#FFFBEB',
      borderColor: '#FDE68A',
      supportingText: t ? t('bookings.pendingText', 'Waiting for hotel partner approval.') : 'Waiting for hotel partner approval.'
    };
  }

  if (status === 'CONFIRMED' || status === 'ACCEPTED') {
    return {
      label: `✓ ${t ? t('bookings.statusConfirmed', 'Confirmed') : 'Confirmed'}`,
      textColor: '#065F46',
      bgColor: '#ECFDF5',
      borderColor: '#A7F3D0',
      supportingText: t ? t('bookings.confirmedText', 'Your accommodation is confirmed.') : 'Your accommodation is confirmed.'
    };
  }

  if (status === 'DECLINED' || status === 'REJECTED') {
    return {
      label: `✕ ${t ? t('bookings.statusDeclined', 'Declined') : 'Declined'}`,
      textColor: '#991B1B',
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
      supportingText: t ? t('bookings.declinedText', 'The hotel did not approve this request.') : 'The hotel did not approve this request.'
    };
  }

  if (status === 'CANCELLED') {
    return {
      label: `✕ ${t ? t('bookings.statusCancelled', 'Cancelled') : 'Cancelled'}`,
      textColor: '#475569',
      bgColor: '#F1F5F9',
      borderColor: '#CBD5E1',
      supportingText: t ? t('bookings.cancelledText', 'This booking was cancelled.') : 'This booking was cancelled.'
    };
  }

  if (status === 'CHECKED_IN' || status === 'COMPLETED') {
    return {
      label: `✓ ${t ? t('bookings.statusCompleted', 'Completed') : 'Completed'}`,
      textColor: '#1E40AF',
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
      supportingText: t ? t('bookings.completedText', 'Stay completed at accommodation.') : 'Stay completed at accommodation.'
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

export default function BookingCard({ booking, onViewDetails }) {
  const { t } = useTranslation();
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  if (!booking) return null;

  const statusCfg = getStatusConfig(booking.status, t);
  const bookingRef = booking.booking_id || booking.id || 'N/A';
  const hotelName = booking.hotel_name || 'Shrine Pilgrimage Lodge';
  const guestsCount = booking.guest_count || booking.guests || 1;

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

  const handleOpenDetails = () => {
    if (onViewDetails) {
      onViewDetails(booking);
    } else {
      setShowDetailsModal(true);
    }
  };

  return (
    <>
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
            <div
              style={{
                fontSize: '0.78rem',
                color: '#64748B',
                marginTop: '0.2rem',
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                lineHeight: 1.4
              }}
              title={`Full Booking UUID: ${bookingRef}`}
            >
              <span style={{ fontWeight: 600 }}>{t('bookings.bookingId', 'Booking')}:</span>{' '}
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E293B', backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: '4px' }}>
                #{formatHumanRef(bookingRef)}
              </span>
            </div>
          </div>

          <StatusBadge
            status={booking.status || 'PENDING'}
            theme="light"
            size="sm"
            label={statusCfg.label.replace(/^[✓✕⏳•\s]+/, '')}
          />
        </div>

        {/* 2. Room, Dates & Guests Count */}
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
          <div style={{
            fontSize: '0.8rem',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: '600',
            marginTop: '0.1rem'
          }}>
            <span>👥</span>
            <span>{guestsCount} {t('bookings.guests', 'Guests')}</span>
          </div>
        </div>

        {/* 3. Amount & Action Button */}
        <div style={{
          paddingTop: '0.35rem',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline'
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
              fontSize: '0.75rem',
              fontWeight: '600',
              color: statusCfg.textColor
            }}>
              {statusCfg.supportingText}
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenDetails}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '0.55rem',
              color: '#1E293B',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'background 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
          >
            <span>👁️</span>
            <span>{t('bookings.viewDetails', 'View Details')}</span>
          </button>
        </div>
      </div>

      {/* Interactive Booking Details Modal Dialog */}
      {showDetailsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-detail-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
            }
          }}
        >
          <div style={{
            background: '#FFFFFF',
            borderRadius: '1rem',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 id="booking-detail-modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#0F172A' }}>
                  {t('bookings.bookingDetails', 'Pilgrimage Stay Pass')}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  ID: {bookingRef}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '0.45rem',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: '700',
                  color: '#64748B'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: statusCfg.bgColor,
                border: `1px solid ${statusCfg.borderColor}`,
                borderRadius: '0.75rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: statusCfg.textColor, fontWeight: '800' }}>
                    {t('bookings.status', 'Current Status')}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: statusCfg.textColor, marginTop: '0.15rem' }}>
                    {statusCfg.label}
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: statusCfg.textColor, fontWeight: '600', maxWidth: '180px', textAlign: 'right' }}>
                  {statusCfg.supportingText}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.85rem' }}>
                <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '600' }}>{t('bookings.hotel', 'Accommodation')}</div>
                  <div style={{ fontWeight: '800', color: '#0F172A', marginTop: '0.2rem' }}>{hotelName}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '600' }}>{t('bookings.room', 'Room')}</div>
                  <div style={{ fontWeight: '800', color: '#0F172A', marginTop: '0.2rem' }}>{roomTypeDisplay}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '600' }}>{t('bookings.checkIn', 'Check-In')}</div>
                  <div style={{ fontWeight: '800', color: '#0F172A', marginTop: '0.2rem' }}>{checkInFormatted}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '600' }}>{t('bookings.checkOut', 'Check-Out')}</div>
                  <div style={{ fontWeight: '800', color: '#0F172A', marginTop: '0.2rem' }}>{checkOutFormatted}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '600' }}>{t('bookings.guests', 'Guests Count')}</div>
                  <div style={{ fontWeight: '800', color: '#0F172A', marginTop: '0.2rem' }}>👥 {guestsCount}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '600' }}>{t('bookings.totalAmount', 'Total Price')}</div>
                  <div style={{ fontWeight: '900', color: '#0F172A', marginTop: '0.2rem', fontSize: '1rem' }}>{amountFormatted}</div>
                </div>
              </div>

              <div style={{
                fontSize: '0.75rem',
                color: '#64748B',
                background: '#F1F5F9',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <span>🛡️</span>
                <span>Official YatraSetu Verified Guarantee • 24/7 SDRF Pilgrim Helpline: 112 / 1070</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '0.85rem 1.5rem',
              background: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                style={{
                  padding: '0.45rem 1.25rem',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: '#FFFFFF',
                  background: '#0F172A',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
