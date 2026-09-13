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
  const seatsPerBus = agencyConfig.bus_seat_capacity;

  const handleSliderChange = (e) => {
    setDeployedBuses(parseInt(e.target.value, 10) || 0);
  };

  const handleStep = (delta) => {
    setDeployedBuses((prev) => Math.min(totalFleet, Math.max(1, prev + delta)));
  };

  const handlePercentageJump = (pct) => {
    const newVal = Math.round(deployedBuses * (1 + pct / 100));
    setDeployedBuses(Math.min(totalFleet, Math.max(1, newVal)));
  };

  const fwdOcc = simulationResult.forward_occupancy_pct;
  const retOcc = simulationResult.return_occupancy_pct;
  const totalSeats = deployedBuses * seatsPerBus;
  const unmetPax = simulationResult.unmet_passengers;

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
            Module 1 · Dynamic Capacity Allocation
          </div>
          <h4 style={{ margin: '0.15rem 0 0', fontSize: '1.15rem', fontWeight: '800', color: '#0F172A' }}>
            Fleet Deployment Simulator
          </h4>
        </div>
        <span style={{
          fontSize: '0.74rem',
          backgroundColor: '#EFF6FF',
          color: '#1E40AF',
          padding: '0.25rem 0.65rem',
          borderRadius: '0.35rem',
          fontWeight: 'bold',
          border: '1px solid #BFDBFE'
        }}>
          🏢 {agencyConfig.agency_name} (Fleet: {totalFleet} Coaches)
        </span>
      </div>

      {/* Main Bus Counter & Expanded Controls */}
      <div style={{
        backgroundColor: '#F8FAFC',
        border: '1.5px solid #E2E8F0',
        borderRadius: '0.65rem',
        padding: '1.1rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1E293B' }}>
            Adjust Active Route Deployment (Buses)
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {/* Quick Presets */}
            <button
              type="button"
              onClick={() => setDeployedBuses(1)}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                padding: '0.2rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Min (1)
            </button>
            <button
              type="button"
              onClick={() => handlePercentageJump(-20)}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                padding: '0.2rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              -20%
            </button>
            <button
              type="button"
              onClick={() => setDeployedBuses(recommended)}
              style={{
                backgroundColor: '#EFF6FF',
                color: '#1E40AF',
                border: '1.5px solid #3B82F6',
                padding: '0.2rem 0.6rem',
                borderRadius: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              ✨ AI Optimal ({recommended})
            </button>
            <button
              type="button"
              onClick={() => handlePercentageJump(20)}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                padding: '0.2rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              +20%
            </button>
            <button
              type="button"
              onClick={() => setDeployedBuses(totalFleet)}
              style={{
                backgroundColor: '#FFFFFF',
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

        {/* Counter Widget with Multi-level Stepper Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', margin: '0.6rem 0', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleStep(-10)}
            title="Decrease by 10 buses"
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.4rem',
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '0.88rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            -10
          </button>
          <button
            type="button"
            onClick={() => handleStep(-5)}
            title="Decrease by 5 buses"
            style={{
              padding: '0.4rem 0.7rem',
              borderRadius: '0.4rem',
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '0.88rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            -5
          </button>
          <button
            type="button"
            onClick={() => handleStep(-1)}
            title="Decrease by 1 bus"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1.5px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              fontSize: '1.25rem',
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

          {/* Centered Large Number Input */}
          <div style={{ textAlign: 'center', margin: '0 0.5rem' }}>
            <input
              type="number"
              min="1"
              max={totalFleet}
              value={deployedBuses}
              onChange={(e) => setDeployedBuses(Math.min(totalFleet, Math.max(0, parseInt(e.target.value, 10) || 0)))}
              style={{
                width: '110px',
                fontSize: '2.3rem',
                fontWeight: '900',
                color: '#1E3A8A',
                border: '2.5px solid #2563EB',
                borderRadius: '0.5rem',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                padding: '0.15rem 0.3rem',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(37,99,235,0.15)'
              }}
            />
            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.25rem', fontWeight: '600' }}>
              buses deployed ({totalSeats.toLocaleString()} seats)
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleStep(1)}
            title="Increase by 1 bus"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1.5px solid #2563EB',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              fontSize: '1.25rem',
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
            onClick={() => handleStep(5)}
            title="Increase by 5 buses"
            style={{
              padding: '0.4rem 0.7rem',
              borderRadius: '0.4rem',
              border: '1.5px solid #2563EB',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              fontSize: '0.88rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
            }}
          >
            +5
          </button>
          <button
            type="button"
            onClick={() => handleStep(10)}
            title="Increase by 10 buses"
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.4rem',
              border: '1.5px solid #2563EB',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              fontSize: '0.88rem',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
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
            margin: '0.85rem 0 0.35rem'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', fontWeight: '600' }}>
          <span>1 Bus (Min Single Coach)</span>
          <span style={{ color: '#2563EB', fontWeight: '800' }}>
            Recommended: {recommended} Buses
          </span>
          <span>{totalFleet} Buses (Total Owned Fleet)</span>
        </div>
      </div>

      {/* BIDIRECTIONAL JOURNEY LOAD FACTOR METERS */}
      <div style={{
        backgroundColor: '#F1F5F9',
        border: '1px solid #CBD5E1',
        borderRadius: '0.65rem',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          Bidirectional Corridor Load Factor (Live Recalculation)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Forward Trip Load */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#065F46' }}>
                ➡️ OUTBOUND (HUB ➔ SHRINE)
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#065F46' }}>
                {fwdOcc}%
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.45rem' }}>
              <div style={{
                width: `${fwdOcc}%`,
                height: '100%',
                backgroundColor: fwdOcc >= 85 ? '#059669' : fwdOcc >= 60 ? '#3B82F6' : '#F59E0B',
                transition: 'width 0.2s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B' }}>
              <span>Carried: <strong>{simulationResult.forward_passengers_carried.toLocaleString()} pax</strong></span>
              <span>Offered: <strong>{totalSeats.toLocaleString()} seats</strong></span>
            </div>
            {unmetPax > 0 && (
              <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 'bold', marginTop: '0.3rem' }}>
                ⚠️ ~{unmetPax.toLocaleString()} pilgrims unserved (spillover)
              </div>
            )}
          </div>

          {/* Return Trip Load */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#5B21B6' }}>
                ↩️ RETURN BACKHAUL (SHRINE ➔ HUB)
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#5B21B6' }}>
                {retOcc}%
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.45rem' }}>
              <div style={{
                width: `${retOcc}%`,
                height: '100%',
                backgroundColor: retOcc >= 60 ? '#7C3AED' : retOcc >= 35 ? '#8B5CF6' : '#D97706',
                transition: 'width 0.2s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B' }}>
              <span>Carried: <strong>{simulationResult.return_passengers_carried.toLocaleString()} pax</strong></span>
              <span>Empty Seats: <strong>{(totalSeats - simulationResult.return_passengers_carried).toLocaleString()}</strong></span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6D28D9', marginTop: '0.3rem' }}>
              ℹ️ Return demand naturally lags due to multi-day shrine stay
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Inventory & Operational Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.65rem',
        marginBottom: '0.85rem'
      }}>
        <div style={{ backgroundColor: '#F8FAFC', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 'bold' }}>Depot Reserve Buffer</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '900', color: simulationResult.reserve_fleet < 20 ? '#DC2626' : '#15803D' }}>
            {simulationResult.reserve_fleet} buses
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Breakdown contingency</div>
        </div>

        <div style={{ backgroundColor: '#F8FAFC', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 'bold' }}>Active Route Seats</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#2563EB' }}>
            {totalSeats.toLocaleString()} seats
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Across {deployedBuses} active coaches</div>
        </div>

        <div style={{ backgroundColor: '#F8FAFC', padding: '0.65rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 'bold' }}>Fleet Utilization</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0F172A' }}>
            {simulationResult.fleet_utilization_pct}%
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{deployedBuses} of {totalFleet} active</div>
        </div>
      </div>

      {/* Dynamic Recalculation Impact Notice */}
      <div style={{
        padding: '0.7rem 0.9rem',
        backgroundColor: simulationResult.unmet_buses > 0 ? '#FEF2F2' : '#F0FDF4',
        border: `1px solid ${simulationResult.unmet_buses > 0 ? '#FECACA' : '#BBF7D0'}`,
        borderRadius: '0.5rem',
        fontSize: '0.8rem',
        color: simulationResult.unmet_buses > 0 ? '#991B1B' : '#166534',
        lineHeight: 1.45
      }}>
        {simulationResult.unmet_buses > 0 ? (
          <>
            ⚠️ <strong>Corridor Shortfall Warning:</strong> Deploying {deployedBuses} buses leaves ~{simulationResult.unmet_passengers.toLocaleString()} corridor passengers ({simulationResult.unmet_buses} busloads) unserved during peak hours. Competitors or state buses will absorb this demand.
          </>
        ) : (
          <>
            ✅ <strong>Full Demand Absorbed:</strong> {deployedBuses} buses fully satisfy the corridor demand of {demandForecast.total_passenger_demand.toLocaleString()} pilgrims, leaving {simulationResult.reserve_fleet} standby coaches in depot for highway breakdown contingencies.
          </>
        )}
      </div>
    </div>
  );
}

