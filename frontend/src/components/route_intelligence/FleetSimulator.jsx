import React from 'react';

export default function FleetSimulator({
  deployedBuses,
  setDeployedBuses,
  simulationResult,
  aiRecommendation,
  agencyConfig,
  demandForecast
}) {
  const totalFleet = agencyConfig.total_fleet_capacity;
  const recommended = aiRecommendation.recommended_buses;

  const handleSliderChange = (e) => {
    setDeployedBuses(parseInt(e.target.value, 10) || 0);
  };

  const handleStep = (delta) => {
    setDeployedBuses((prev) => Math.min(totalFleet, Math.max(1, prev + delta)));
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
      {/* Simulator Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Module 1 · Capacity Simulation
          </div>
          <h4 style={{ margin: '0.15rem 0 0', fontSize: '1.1rem', fontWeight: '800', color: '#0F172A' }}>
            Fleet Deployment Simulator
          </h4>
        </div>
        <span style={{
          fontSize: '0.74rem',
          backgroundColor: '#EFF6FF',
          color: '#1E40AF',
          padding: '0.2rem 0.55rem',
          borderRadius: '0.25rem',
          fontWeight: 'bold',
          border: '1px solid #BFDBFE'
        }}>
          {agencyConfig.agency_name}
        </span>
      </div>

      {/* Main Bus Counter & +/- Controls */}
      <div style={{
        backgroundColor: '#F8FAFC',
        border: '1.5px solid #E2E8F0',
        borderRadius: '0.65rem',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#334155' }}>
            Active Buses to Deploy
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Quick Presets */}
            <button
              type="button"
              onClick={() => setDeployedBuses(recommended)}
              style={{
                backgroundColor: '#EFF6FF',
                color: '#1E40AF',
                border: '1px solid #BFDBFE',
                padding: '0.2rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Match AI ({recommended})
            </button>
            <button
              type="button"
              onClick={() => setDeployedBuses(totalFleet)}
              style={{
                backgroundColor: '#F1F5F9',
                color: '#475569',
                border: '1px solid #CBD5E1',
                padding: '0.2rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Max ({totalFleet})
            </button>
          </div>
        </div>

        {/* Counter Widget */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', margin: '0.5rem 0' }}>
          <button
            type="button"
            onClick={() => handleStep(-10)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              fontSize: '1rem',
              fontWeight: '900',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            -10
          </button>
          <button
            type="button"
            onClick={() => handleStep(-1)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              fontSize: '1.2rem',
              fontWeight: '900',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            -
          </button>

          {/* Number Input */}
          <div style={{ textAlign: 'center' }}>
            <input
              type="number"
              min="1"
              max={totalFleet}
              value={deployedBuses}
              onChange={(e) => setDeployedBuses(Math.min(totalFleet, Math.max(0, parseInt(e.target.value, 10) || 0)))}
              style={{
                width: '100px',
                fontSize: '2.2rem',
                fontWeight: '900',
                color: '#1E3A8A',
                border: '2px solid #2563EB',
                borderRadius: '0.5rem',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                padding: '0.2rem',
                outline: 'none'
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
              out of <strong>{totalFleet} buses total</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleStep(1)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1.5px solid #2563EB',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              fontSize: '1.2rem',
              fontWeight: '900',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
            }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => handleStep(10)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1.5px solid #2563EB',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              fontSize: '1rem',
              fontWeight: '900',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
            }}
          >
            +10
          </button>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min="1"
          max={totalFleet}
          value={deployedBuses}
          onChange={handleSliderChange}
          style={{
            width: '100%',
            accentColor: '#2563EB',
            cursor: 'pointer',
            margin: '0.75rem 0 0.25rem'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94A3B8' }}>
          <span>1 Bus (Min)</span>
          <span style={{ color: '#2563EB', fontWeight: 'bold' }}>
            Recommended: {recommended} Buses
          </span>
          <span>{totalFleet} Buses (Max)</span>
        </div>
      </div>

      {/* Fleet Breakdown Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.65rem',
        marginBottom: '0.85rem'
      }}>
        <div style={{ backgroundColor: '#F8FAFC', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 'bold' }}>Available Fleet</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0F172A' }}>{simulationResult.available_fleet}</div>
        </div>

        <div style={{ backgroundColor: '#F8FAFC', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 'bold' }}>Reserve Buffer</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '900', color: simulationResult.reserve_fleet < 20 ? '#DC2626' : '#15803D' }}>
            {simulationResult.reserve_fleet}
          </div>
        </div>

        <div style={{ backgroundColor: '#F8FAFC', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Seats Deployed</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#2563EB' }}>
            {(deployedBuses * agencyConfig.bus_seat_capacity).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Dynamic Recalculation Impact Notice */}
      <div style={{
        padding: '0.65rem 0.85rem',
        backgroundColor: simulationResult.unmet_buses > 0 ? '#FEF2F2' : '#F0FDF4',
        border: `1px solid ${simulationResult.unmet_buses > 0 ? '#FECACA' : '#BBF7D0'}`,
        borderRadius: '0.5rem',
        fontSize: '0.78rem',
        color: simulationResult.unmet_buses > 0 ? '#991B1B' : '#166534',
        lineHeight: 1.4
      }}>
        {simulationResult.unmet_buses > 0 ? (
          <>
            ⚠️ <strong>Capacity Shortfall:</strong> At {deployedBuses} buses, ~{simulationResult.unmet_passengers.toLocaleString()} passengers ({simulationResult.unmet_buses} busloads) remain unmet. Shortage risk is elevated.
          </>
        ) : (
          <>
            ✅ <strong>Full Demand Covered:</strong> {deployedBuses} buses fully absorb projected passenger influx with {simulationResult.reserve_fleet} contingency reserves remaining.
          </>
        )}
      </div>
    </div>
  );
}
