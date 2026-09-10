import React from 'react';

export default function EventContextBanner({ eventContext, routeInfo, dateSelection }) {
  if (!eventContext) return null;

  const hasEvent = eventContext.has_event;
  const isAstrological = eventContext.event_type === 'ASTROLOGICAL_TITHI';

  return (
    <div style={{
      backgroundColor: hasEvent ? (isAstrological ? '#FFFBEB' : '#F0FDF4') : '#F8FAFC',
      border: `1.5px solid ${hasEvent ? (isAstrological ? '#FCD34D' : '#86EFAC') : '#E2E8F0'}`,
      borderRadius: '0.75rem',
      padding: '1rem 1.25rem',
      marginBottom: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    }}>
      {/* Event Details */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: '1 1 500px' }}>
        <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>
          {isAstrological ? '🛕' : hasEvent ? '🌿' : 'ℹ️'}
        </span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span style={{
              backgroundColor: isAstrological ? '#FEF3C7' : hasEvent ? '#DCFCE7' : '#E2E8F0',
              color: isAstrological ? '#B45309' : hasEvent ? '#15803D' : '#475569',
              padding: '0.2rem 0.6rem',
              borderRadius: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: '800',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              {eventContext.event_type}
            </span>
            <strong style={{ fontSize: '1.05rem', color: isAstrological ? '#78350F' : '#0F172A' }}>
              Detected Event: {eventContext.event_name}
            </strong>
          </div>

          <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>
            {eventContext.description}
          </p>

          {/* Citation & Peak Surge Window */}
          <div style={{ marginTop: '0.35rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748B' }}>
            <span>📖 <strong>Source:</strong> {eventContext.source_citation}</span>
            <span>⏰ <strong>Peak Window:</strong> {eventContext.peak_surge_window}</span>
            {eventContext.cctv_signal && (
              <span style={{ color: '#DC2626', fontWeight: 'bold' }}>
                📹 {eventContext.cctv_signal}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Numerical Impact Badges */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {/* Expected Demand Impact */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: `1px solid ${hasEvent ? '#FDE68A' : '#CBD5E1'}`,
          borderRadius: '0.5rem',
          padding: '0.5rem 0.85rem',
          textAlign: 'center',
          minWidth: '110px'
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Demand Impact
          </div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: '900',
            color: hasEvent ? '#B45309' : '#0F172A'
          }}>
            {eventContext.demand_impact}
          </div>
        </div>

        {/* Confidence Score */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: '0.5rem',
          padding: '0.5rem 0.85rem',
          textAlign: 'center',
          minWidth: '95px'
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Confidence
          </div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: '900',
            color: '#15803D'
          }}>
            {eventContext.confidence_pct}%
          </div>
        </div>
      </div>
    </div>
  );
}
