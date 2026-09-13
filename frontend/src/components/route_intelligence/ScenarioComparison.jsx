import React from 'react';

export default function ScenarioComparison({
  scenarios,
  onSelectScenario
}) {
  if (!scenarios) return null;

  const { current_plan, ai_recommended, custom_scenario } = scenarios;
  const list = [current_plan, ai_recommended, custom_scenario];

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'CRITICAL': return '#DC2626';
      case 'ELEVATED':
      case 'MODERATE': return '#D97706';
      default: return '#16A34A';
    }
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Decision Intelligence
          </div>
          <h4 style={{ margin: '0.15rem 0 0', fontSize: '1.1rem', fontWeight: '800', color: '#0F172A' }}>
            Scenario Comparison Matrix
          </h4>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Evaluate trade-offs across deployment, margins &amp; shortage risk
        </span>
      </div>

      {/* Comparison Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.85rem'
      }}>
        {list.map((sc, idx) => {
          const isAi = sc.name === 'AI Recommended';
          const isCustom = sc.name === 'Custom Scenario';

          return (
            <div
              key={idx}
              style={{
                backgroundColor: isAi ? '#FFFBEB' : '#F8FAFC',
                border: isAi ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                borderRadius: '0.65rem',
                padding: '1rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              {/* Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  color: isAi ? '#B45309' : '#1E293B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {sc.name}
                </span>
                {isAi && (
                  <span style={{
                    fontSize: '0.68rem',
                    backgroundColor: '#FDE68A',
                    color: '#92400E',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '3px',
                    fontWeight: 'bold'
                  }}>
                    Recommended
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.85rem' }}>
                {sc.description}
              </div>

              {/* Metrics Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>
                  <span style={{ color: '#64748B' }}>Active Buses:</span>
                  <strong style={{ color: '#0F172A' }}>{sc.deployed_buses} buses</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>
                  <span style={{ color: '#64748B' }}>Forward Occupancy:</span>
                  <strong style={{ color: '#0F172A' }}>{sc.forward_occupancy_pct}%</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>
                  <span style={{ color: '#64748B' }}>Return Occupancy:</span>
                  <strong style={{ color: '#0F172A' }}>{sc.return_occupancy_pct}%</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>
                  <span style={{ color: '#64748B' }}>Route Seats:</span>
                  <strong style={{ color: '#0369A1' }}>{(sc.deployed_buses * 42).toLocaleString()} seats</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>
                  <span style={{ color: '#64748B' }}>Depot Reserve:</span>
                  <strong style={{ color: '#0F172A' }}>{sc.reserve_fleet} buses</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>
                  <span style={{ color: '#64748B' }}>Unmet Demand:</span>
                  <strong style={{ color: sc.unmet_passengers > 0 ? '#DC2626' : '#16A34A' }}>
                    {sc.unmet_passengers > 0 ? `${sc.unmet_buses} buses` : 'None'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.15rem' }}>
                  <span style={{ color: '#64748B' }}>Risk Level:</span>
                  <strong style={{ color: getRiskColor(sc.operational_risk) }}>
                    {sc.operational_risk}
                  </strong>
                </div>
              </div>

              {/* Action Button */}
              {onSelectScenario && !isCustom && (
                <button
                  type="button"
                  onClick={() => onSelectScenario(sc)}
                  style={{
                    marginTop: '0.85rem',
                    width: '100%',
                    backgroundColor: isAi ? '#D97706' : '#FFFFFF',
                    color: isAi ? '#FFFFFF' : '#334155',
                    border: isAi ? 'none' : '1px solid #CBD5E1',
                    borderRadius: '0.4rem',
                    padding: '0.4rem',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Load {sc.name}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
