import React from 'react';

export default function RouteKpiRow({
  demandForecast,
  simulationResult,
  aiRecommendation,
  agencyConfig
}) {
  if (!demandForecast || !simulationResult) return null;

  const totalDemandBuses = demandForecast.total_demand_buses;
  const passengers = demandForecast.total_passenger_demand;
  const deployed = simulationResult.deployed_buses;
  const totalFleet = agencyConfig.total_fleet_capacity;
  const reserve = simulationResult.reserve_fleet;
  const utilization = simulationResult.fleet_utilization_pct;
  const fwdOcc = simulationResult.forward_occupancy_pct;
  const retOcc = simulationResult.return_occupancy_pct;
  const revenue = simulationResult.gross_revenue;
  const netMargin = simulationResult.net_operating_margin;
  const marginPct = simulationResult.margin_pct;
  const risk = simulationResult.operational_risk;

  // Risk styling
  const getRiskStyle = (r) => {
    switch (r) {
      case 'CRITICAL':
        return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', badgeBg: '#FEE2E2', badgeText: '#991B1B' };
      case 'ELEVATED':
      case 'MODERATE':
        return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', badgeBg: '#FEF3C7', badgeText: '#92400E' };
      default:
        return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', badgeBg: '#DCFCE7', badgeText: '#15803D' };
    }
  };

  const riskStyle = getRiskStyle(risk);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
      gap: '0.85rem',
      marginBottom: '1.25rem'
    }}>
      {/* 1. CORRIDOR PASSENGER DEMAND */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '0.75rem',
        padding: '0.95rem 1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        borderTop: '3px solid #D97706',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Corridor Demand
            </span>
            <span style={{ fontSize: '0.68rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: '700' }}>
              Market Pool
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0F172A', lineHeight: 1.2, margin: '0.3rem 0 0.15rem' }}>
            {passengers.toLocaleString()} <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748B' }}>pax</span>
          </div>
        </div>
        <div style={{ fontSize: '0.74rem', color: '#B45309', fontWeight: '600', marginTop: '0.35rem' }}>
          Equivalent to <strong>{totalDemandBuses} buses</strong> load
        </div>
      </div>

      {/* 2. FLEET DEPLOYED / TOTAL FLEET CEILING */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '0.75rem',
        padding: '0.95rem 1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        borderTop: '3px solid #2563EB',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fleet Deployment
            </span>
            <span style={{ fontSize: '0.68rem', backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: '700' }}>
              Cap: {totalFleet}
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#1E3A8A', lineHeight: 1.2, margin: '0.3rem 0 0.15rem' }}>
            {deployed} <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748B' }}>/ {totalFleet} buses</span>
          </div>
        </div>
        <div style={{ fontSize: '0.74rem', color: '#2563EB', fontWeight: '600', marginTop: '0.35rem' }}>
          {utilization}% active · {reserve} in depot reserve
        </div>
      </div>

      {/* 3. FORWARD JOURNEY OCCUPANCY */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '0.75rem',
        padding: '0.95rem 1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        borderTop: '3px solid #059669',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Forward Occupancy
            </span>
            <span style={{ fontSize: '0.68rem', backgroundColor: '#ECFDF5', color: '#065F46', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: '700' }}>
              Outbound Leg
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#065F46', lineHeight: 1.2, margin: '0.3rem 0 0.15rem' }}>
            {fwdOcc}% <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748B' }}>load factor</span>
          </div>
        </div>
        <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: '600', marginTop: '0.35rem' }}>
          {simulationResult.forward_passengers_carried.toLocaleString()} pilgrims on outward trip
        </div>
      </div>

      {/* 4. RETURN JOURNEY OCCUPANCY */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '0.75rem',
        padding: '0.95rem 1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        borderTop: '3px solid #7C3AED',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Return Occupancy
            </span>
            <span style={{ fontSize: '0.68rem', backgroundColor: '#F5F3FF', color: '#5B21B6', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: '700' }}>
              Backhaul Leg
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#5B21B6', lineHeight: 1.2, margin: '0.3rem 0 0.15rem' }}>
            {retOcc}% <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748B' }}>load factor</span>
          </div>
        </div>
        <div style={{ fontSize: '0.74rem', color: '#6D28D9', fontWeight: '600', marginTop: '0.35rem' }}>
          {simulationResult.return_passengers_carried.toLocaleString()} backhaul return bookings
        </div>
      </div>

      {/* 5. ESTIMATED REVENUE & NET MARGIN */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '0.75rem',
        padding: '0.95rem 1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        borderTop: '3px solid #0284C7',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Financial Yield
            </span>
            <span style={{ fontSize: '0.68rem', backgroundColor: '#E0F2FE', color: '#0369A1', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: '700' }}>
              Round-Trip P&amp;L
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0369A1', lineHeight: 1.2, margin: '0.3rem 0 0.15rem' }}>
            ₹{(revenue / 100000).toFixed(2)}L <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748B' }}>gross</span>
          </div>
        </div>
        <div style={{ fontSize: '0.74rem', color: netMargin >= 0 ? '#15803D' : '#DC2626', fontWeight: '700', marginTop: '0.35rem' }}>
          Net: ₹{(netMargin / 100000).toFixed(2)}L ({marginPct}% margin)
        </div>
      </div>

      {/* 6. OPERATIONAL RISK / SHORTFALL */}
      <div style={{
        backgroundColor: riskStyle.bg,
        border: `1px solid ${riskStyle.border}`,
        borderRadius: '0.75rem',
        padding: '0.95rem 1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        borderTop: `3px solid ${riskStyle.text}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Corridor Risk
            </span>
            <span style={{ fontSize: '0.68rem', backgroundColor: riskStyle.badgeBg, color: riskStyle.badgeText, padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: '700' }}>
              Live Status
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: riskStyle.text, lineHeight: 1.2, margin: '0.3rem 0 0.15rem' }}>
            {risk}
          </div>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#334155', lineHeight: 1.2, marginTop: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={simulationResult.risk_description}>
          {simulationResult.risk_description}
        </div>
      </div>
    </div>
  );
}

