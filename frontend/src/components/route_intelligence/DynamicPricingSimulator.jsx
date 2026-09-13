import React from 'react';

export default function DynamicPricingSimulator({
  forwardFare,
  setForwardFare,
  returnFare,
  setReturnFare,
  simulationResult,
  aiRecommendation,
  agencyConfig
}) {
  const baseFare = agencyConfig.base_fare_per_seat;

  const fwdSurgePct = Math.round(((forwardFare - baseFare) / baseFare) * 100);
  const retDiscountPct = Math.round(((baseFare - returnFare) / baseFare) * 100);

  const handleForwardStep = (delta) => {
    setForwardFare((prev) => Math.max(baseFare, Math.min(Math.round(baseFare * 2.0), prev + delta)));
  };

  const handleReturnStep = (delta) => {
    setReturnFare((prev) => Math.max(Math.round(baseFare * 0.4), Math.min(baseFare, prev + delta)));
  };

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      marginBottom: '1.25rem'
    }}>
      {/* Module Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Module 2 · Elasticity &amp; Yield Management
          </div>
          <h4 style={{ margin: '0.15rem 0 0', fontSize: '1.15rem', fontWeight: '800', color: '#0F172A' }}>
            Dynamic Pricing &amp; Backhaul Simulator
          </h4>
        </div>
        <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 'bold' }}>
          Standard Base Fare: <strong>₹{baseFare}/seat</strong>
        </span>
      </div>

      {/* 2-Column Pricing Control Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.85rem',
        marginBottom: '1rem'
      }}>
        {/* FORWARD TRIP FARE */}
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '0.65rem',
          padding: '0.95rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1E40AF' }}>
              ➡️ FORWARD SURGE (OUTBOUND)
            </span>
            <span style={{
              fontSize: '0.7rem',
              backgroundColor: fwdSurgePct > 0 ? '#DBEAFE' : '#E2E8F0',
              color: fwdSurgePct > 0 ? '#1E40AF' : '#475569',
              padding: '0.15rem 0.45rem',
              borderRadius: '3px',
              fontWeight: 'bold'
            }}>
              {fwdSurgePct >= 0 ? `+${fwdSurgePct}% Surge` : `${fwdSurgePct}% Discount`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0.35rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#1E3A8A' }}>
                ₹{forwardFare}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>/ seat</span>
            </div>

            {/* Stepper buttons */}
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button
                type="button"
                onClick={() => handleForwardStep(-50)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  border: '1px solid #93C5FD',
                  backgroundColor: '#FFFFFF',
                  color: '#1E40AF',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleForwardStep(50)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  border: '1px solid #93C5FD',
                  backgroundColor: '#FFFFFF',
                  color: '#1E40AF',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Forward Slider */}
          <input
            type="range"
            min={baseFare}
            max={Math.round(baseFare * 1.8)}
            step="25"
            value={forwardFare}
            onChange={(e) => setForwardFare(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: '#2563EB', cursor: 'pointer', margin: '0.5rem 0 0.35rem' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748B' }}>
            <span>Base ₹{baseFare}</span>
            <span style={{ color: '#2563EB', fontWeight: 'bold' }}>
              AI Rec: ₹{aiRecommendation.recommended_forward_fare}
            </span>
            <span>₹{Math.round(baseFare * 1.8)} (Max)</span>
          </div>

          {/* Occupancy Impact */}
          <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid #DBEAFE', fontSize: '0.75rem', color: '#1E40AF' }}>
            Expected Forward Load: <strong>{simulationResult.forward_occupancy_pct}% full</strong>
          </div>
        </div>

        {/* RETURN TRIP FARE */}
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '0.65rem',
          padding: '0.95rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#991B1B' }}>
              ↩️ RETURN DISCOUNT (BACKHAUL)
            </span>
            <span style={{
              fontSize: '0.7rem',
              backgroundColor: retDiscountPct > 0 ? '#FEE2E2' : '#E2E8F0',
              color: retDiscountPct > 0 ? '#991B1B' : '#475569',
              padding: '0.15rem 0.45rem',
              borderRadius: '3px',
              fontWeight: 'bold'
            }}>
              {retDiscountPct > 0 ? `-${retDiscountPct}% Discount` : `Base Rate`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0.35rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#DC2626' }}>
                ₹{returnFare}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>/ seat</span>
            </div>

            {/* Stepper buttons */}
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button
                type="button"
                onClick={() => handleReturnStep(-40)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  border: '1px solid #FCA5A5',
                  backgroundColor: '#FFFFFF',
                  color: '#DC2626',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleReturnStep(40)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  border: '1px solid #FCA5A5',
                  backgroundColor: '#FFFFFF',
                  color: '#DC2626',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Return Slider */}
          <input
            type="range"
            min={Math.round(baseFare * 0.55)}
            max={baseFare}
            step="20"
            value={returnFare}
            onChange={(e) => setReturnFare(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: '#DC2626', cursor: 'pointer', margin: '0.5rem 0 0.35rem' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748B' }}>
            <span>₹{Math.round(baseFare * 0.55)} (Max Disc)</span>
            <span style={{ color: '#DC2626', fontWeight: 'bold' }}>
              AI Rec: ₹{aiRecommendation.recommended_return_fare}
            </span>
            <span>Base ₹{baseFare}</span>
          </div>

          {/* Elasticity Occupancy Impact */}
          <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid #FEE2E2', fontSize: '0.75rem', color: '#991B1B' }}>
            Stimulated Return Load: <strong>{simulationResult.return_occupancy_pct}% full</strong>
          </div>
        </div>
      </div>

      {/* Yield Advisory Notice */}
      <div style={{
        padding: '0.65rem 0.85rem',
        backgroundColor: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: '0.5rem',
        fontSize: '0.78rem',
        color: '#78350F',
        lineHeight: 1.45
      }}>
        💡 <strong>Economic Reality Check:</strong> Unlike standard urban transit, pilgrimage routes suffer from severe directional asymmetry (high outward rush, low immediate backhaul). Discounting the return fare by {retDiscountPct}% stimulates return travelers, raising backhaul load factor to <strong>{simulationResult.return_occupancy_pct}%</strong> and earning <strong>₹{((simulationResult.return_passengers_carried * returnFare) / 1000).toFixed(0)}k</strong> in secondary revenue rather than burning fuel with empty seats.
      </div>
    </div>
  );
}

