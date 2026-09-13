import React from 'react';

export default function AiRecommendationPanel({
  aiRecommendation,
  onApplyRecommendation,
  routeInfo
}) {
  if (!aiRecommendation) return null;

  const impact = aiRecommendation.projected_impact || {};

  return (
    <div style={{
      backgroundColor: '#FFFBEB',
      border: '2px solid #F59E0B',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      boxShadow: '0 4px 14px rgba(217, 119, 6, 0.12)',
      marginBottom: '1.25rem'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🤖</span>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Optimized Algorithmic Recommendation
            </div>
            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '900', color: '#78350F' }}>
              AI Route Intelligence Plan
            </h4>
          </div>
        </div>

        {/* 1-Click Apply Button */}
        {onApplyRecommendation && (
          <button
            type="button"
            onClick={onApplyRecommendation}
            style={{
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            ✨ Apply AI Recommendation
          </button>
        )}
      </div>

      {/* Bottleneck Statement */}
      <div style={{
        backgroundColor: '#FEF3C7',
        border: '1px solid #FCD34D',
        borderRadius: '0.5rem',
        padding: '0.65rem 0.85rem',
        fontSize: '0.88rem',
        color: '#78350F',
        fontWeight: '600',
        marginBottom: '0.85rem',
        lineHeight: 1.4
      }}>
        🚨 <strong>Corridor Bottleneck:</strong> “{aiRecommendation.bottleneck_statement}”
      </div>

      {/* Recommended Action Checklist */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#92400E', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Recommended Operational Directives:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {aiRecommendation.action_items.map((action, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                fontSize: '0.84rem',
                color: '#451A03',
                backgroundColor: '#FFFFFF',
                padding: '0.45rem 0.75rem',
                borderRadius: '0.4rem',
                border: '1px solid #FDE68A'
              }}
            >
              <span style={{ color: '#D97706', fontWeight: 'bold' }}>✓</span>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quantified Projected Impact Row */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#92400E', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Projected Impact under AI Schedule:
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.6rem'
        }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #FDE68A', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Route Seat Supply</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#0369A1' }}>
              {(impact.deployed_seats || (aiRecommendation.recommended_buses * 42)).toLocaleString()}
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #FDE68A', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Fwd / Ret Occupancy</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#065F46' }}>
              {impact.forward_occupancy}% / {impact.return_occupancy}%
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #FDE68A', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Unmet Demand</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: impact.unmet_passengers > 0 ? '#DC2626' : '#15803D' }}>
              {impact.unmet_passengers > 0 ? `~${impact.unmet_passengers.toLocaleString()} pax` : '0 (Fully Met)'}
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #FDE68A', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Operational Risk</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#15803D' }}>
              {impact.risk}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
