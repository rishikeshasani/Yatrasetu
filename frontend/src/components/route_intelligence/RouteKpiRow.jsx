import React from 'react';

export default function RouteKpiRow({
  demandForecast,
  simulationResult,
  aiRecommendation,
  agencyConfig
}) {
  if (!demandForecast || !simulationResult) return null;

  const totalDemand = demandForecast.total_demand_buses;
  const passengers = demandForecast.total_passenger_demand;
  const deployed = simulationResult.deployed_buses;
  const utilization = simulationResult.fleet_utilization_pct;
  const fwdOcc = simulationResult.forward_occupancy_pct;
  const retOcc = simulationResult.return_occupancy_pct;
  const revenue = simulationResult.gross_revenue;
  const netMargin = simulationResult.net_operating_margin;
  const risk = simulationResult.operational_risk;

  // Risk badge styling
  const getRiskStyle = (r) => {
    switch (r) {
      case 'CRITICAL':
        return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', badge: '#991B1B' };
      case 'ELEVATED':
      case 'MODERATE':
        return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', badge: '#B45309' };
      default:
        return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', badge: '#15803D' };
    }
  };

  const riskStyle = getRiskStyle(risk);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
      gap: '0.85rem',
      marginBottom: '1.25rem'
    }}>
      {/* KPI 1: Predicted Demand */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '0.65rem',
        padding: '0.9rem 1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        borderLeft: '4px solid #D97706'
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Predicted Demand
        </div>
        <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#0F172A', lineHeight: 1.2, margin: '0.25rem 0' }}>
          {totalDemand} <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748B' }}>buses</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: '600' }}>
          ~{passengers.toLocaleString()} passengers
        </div>
      </div>

      {/* KPI 2: Recommended Fleet */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '0.65rem',
        padding: '0.9rem 1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        borderLeft: '4px solid #2563EB'
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Recommended Fleet
        </div>
        <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#1E3A8A', lineHeight: 1.2, margin: '0.25rem 0' }}>
          {aiRecommendation.recommended_buses} <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748B' }}>buses</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: '600' }}>
          Reserve: {aiRecommendation.recommended_reserve} in depot
        </div>
      </div>

      {/* KPI 3: Fleet Utilization */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '0.65rem',
        padding: '0.9rem 1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        borderLeft: '4px solid #7C3AED'
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Fleet Utilization
        </div>
        <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#5B21B6', lineHeight: 1.2, margin: '0.25rem 0' }}>
          {utilization}%
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6D28D9', fontWeight: '600' }}>
          {deployed} of {agencyConfig.total_fleet_capacity} buses active
        </div>
      </div>

      {/* KPI 4: Expected Occupancy */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '0.65rem',
        padding: '0.9rem 1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        borderLeft: '4px solid #059669'
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Expected Occupancy
        </div>
        <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#065F46', lineHeight: 1.2, margin: '0.25rem 0' }}>
          {fwdOcc}% <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B' }}>fwd</span> · {retOcc}% <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B' }}>ret</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>
          Round-trip avg: {Math.round((fwdOcc + retOcc) / 2)}%
        </div>
      </div>

      {/* KPI 5: Estimated Revenue */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '0.65rem',
        padding: '0.9rem 1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        borderLeft: '4px solid #0284C7'
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Estimated Revenue
        </div>
        <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0369A1', lineHeight: 1.2, margin: '0.25rem 0' }}>
          ₹{(revenue / 100000).toFixed(2)}L
        </div>
        <div style={{ fontSize: '0.75rem', color: netMargin >= 0 ? '#15803D' : '#DC2626', fontWeight: '600' }}>
          Net Margin: ₹{(netMargin / 100000).toFixed(2)}L ({simulationResult.margin_pct}%)
        </div>
      </div>

      {/* KPI 6: Operational Risk */}
      <div style={{
        backgroundColor: riskStyle.bg,
        border: `1px solid ${riskStyle.border}`,
        borderRadius: '0.65rem',
        padding: '0.9rem 1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        borderLeft: `4px solid ${riskStyle.text}`
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Operational Risk
        </div>
        <div style={{ fontSize: '1.45rem', fontWeight: '900', color: riskStyle.text, lineHeight: 1.2, margin: '0.25rem 0' }}>
          {risk}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {simulationResult.risk_description}
        </div>
      </div>
    </div>
  );
}
