import React, { useState, useEffect } from 'react';
import { fetchTravelAgencyProfile } from '../api/api';

export default function TravelAgencyConsole() {
  const [profile, setProfile] = useState(null);
  const [activeSurgeId, setActiveSurgeId] = useState('somvati_amavasya');
  const [deployBuses, setDeployBuses] = useState(255);

  useEffect(() => {
    fetchTravelAgencyProfile().then((data) => {
      if (data) {
        setProfile(data);
        const currentWindow = data.surge_windows?.find((w) => w.id === activeSurgeId) || data.surge_windows?.[0];
        if (currentWindow) {
          setDeployBuses(currentWindow.default_deploy_buses || 255);
        }
      }
    });
  }, [activeSurgeId]);

  const activeWindow = profile?.surge_windows?.find((w) => w.id === activeSurgeId) || {
    id: 'somvati_amavasya',
    name: 'Oct 12-13 · Somvati Amavasya',
    corridor: 'Delhi ⇄ Haridwar / Rishikesh',
    total_demand_buses: 370,
    demand_range_min: 340,
    demand_range_max: 400,
    default_deploy_buses: 255,
    forward_occupancy_low: 90,
    forward_occupancy_high: 97,
    return_occupancy_low: 15,
    return_occupancy_high: 28,
    suggested_forward_fare: 1150,
    forward_surge_pct: '+35%',
    suggested_return_fare: 680,
    return_discount_pct: '-20%',
    insight: 'Return leg is significantly underfilled. Consider a return fare discount or shifting the return pickup hub to reduce empty seats.'
  };

  const agencyName = profile?.agency_name || 'Himalaya Yatra Travels';
  const totalFleetCapacity = profile?.total_fleet_capacity || 350;
  const baseFare = profile?.base_fare_per_seat || 850;

  const totalDemand = activeWindow.total_demand_buses;
  const coveragePct = Math.min(100, Math.round((deployBuses / totalDemand) * 100));
  const busesNeededMore = Math.max(0, totalDemand - deployBuses);

  return (
    <div style={{
      backgroundColor: '#0F172A',
      color: '#F8FAFC',
      borderRadius: '1rem',
      padding: '2rem',
      margin: '1.5rem 1.5rem',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
          YatraSetu Partner Ecosystem
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>🚌</span> {agencyName} — Partner Console
        </h2>
        <div style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '0.25rem' }}>
          Fleet Capacity: <strong>{totalFleetCapacity} Buses</strong> • Base Seat Rate: <strong>₹{baseFare}</strong>
        </div>
      </div>

      {/* Upcoming Surge Window Selector */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.6rem' }}>Upcoming surge window</div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {profile?.surge_windows?.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setActiveSurgeId(w.id);
                setDeployBuses(w.default_deploy_buses);
              }}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '9999px',
                fontSize: '0.9rem',
                fontWeight: '600',
                border: activeSurgeId === w.id ? '1.5px solid #F59E0B' : '1px solid #334155',
                backgroundColor: activeSurgeId === w.id ? '#1E293B' : '#1E293B00',
                color: activeSurgeId === w.id ? '#FBBF24' : '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {w.name}
            </button>
          )) || [
            <button key="default" style={{ padding: '0.55rem 1.25rem', borderRadius: '9999px', backgroundColor: '#1E293B', color: '#FBBF24', border: '1.5px solid #F59E0B' }}>
              Oct 12-13 · Somvati Amavasya
            </button>
          ]}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* CARD 1: Buses needed to meet expected demand */}
        <div style={{ backgroundColor: '#1E293B', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.9rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
            Buses needed to meet expected demand — {activeWindow.corridor}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span style={{ fontSize: '3rem', fontWeight: '900', color: '#FFFFFF', lineHeight: 1 }}>
              {totalDemand}
            </span>
            <span style={{ fontSize: '1.1rem', color: '#94A3B8' }}>
              buses total - range {activeWindow.demand_range_min}–{activeWindow.demand_range_max}
            </span>
          </div>
        </div>

        {/* CARD 2: How many buses will you deploy? */}
        <div style={{ backgroundColor: '#1E293B', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#F8FAFC' }}>
              How many buses will you deploy?
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0F172A', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
              <input
                type="number"
                min="0"
                max={totalFleetCapacity}
                value={deployBuses}
                onChange={(e) => setDeployBuses(Math.min(totalFleetCapacity, Math.max(0, parseInt(e.target.value) || 0)))}
                style={{
                  width: '60px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#FBBF24',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
              <span style={{ color: '#64748B', fontSize: '0.85rem' }}>buses</span>
            </div>
          </div>

          {/* Interactive Range Slider */}
          <div style={{ marginBottom: '1.25rem' }}>
            <input
              type="range"
              min="0"
              max={totalFleetCapacity}
              value={deployBuses}
              onChange={(e) => setDeployBuses(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#F59E0B',
                height: '8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Coverage Bar */}
          <div style={{ width: '100%', backgroundColor: '#0F172A', borderRadius: '9999px', height: '0.6rem', overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ width: `${coveragePct}%`, backgroundColor: coveragePct > 80 ? '#22C55E' : '#F59E0B', height: '100%', transition: 'width 0.3s ease' }}></div>
          </div>

          <div style={{ fontSize: '0.9rem', color: '#CBD5E1', lineHeight: '1.4' }}>
            <strong>{coveragePct}% of required capacity covered.</strong>{' '}
            {busesNeededMore > 0
              ? `${busesNeededMore} more buses would fully meet expected demand and maximize the passengers you can serve.`
              : 'Maximum fleet capacity committed! Excellent coverage for this surge window.'}
          </div>
        </div>

        {/* CARD 3: Forward & Return Occupancy + Dynamic Pricing Recommendations */}
        <div style={{ backgroundColor: '#1E293B', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.9rem', color: '#94A3B8', marginBottom: '1rem' }}>
            Forward &amp; return occupancy — this travel window
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
            {/* Forward */}
            <div>
              <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Forward (Outbound)</div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#38BDF8' }}>
                {activeWindow.forward_occupancy_low}–{activeWindow.forward_occupancy_high}%
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.2rem' }}>
                Suggested Fare: <strong style={{ color: '#38BDF8' }}>₹{activeWindow.suggested_forward_fare}</strong> ({activeWindow.forward_surge_pct} Surge)
              </div>
            </div>

            {/* Return */}
            <div>
              <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Return (Inbound)</div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#F43F5E' }}>
                {activeWindow.return_occupancy_low}–{activeWindow.return_occupancy_high}%
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.2rem' }}>
                Suggested Fare: <strong style={{ color: '#F43F5E' }}>₹{activeWindow.suggested_return_fare}</strong> ({activeWindow.return_discount_pct} Discount)
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic', marginBottom: '1rem' }}>
            Based on historical {activeWindow.name} pattern + live corridor density
          </div>

          {/* Actionable Insight Box */}
          <div style={{ backgroundColor: '#451A03', border: '1px solid #78350F', borderRadius: '0.5rem', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem' }}>💡</span>
            <div style={{ fontSize: '0.88rem', color: '#FDE68A', lineHeight: '1.4' }}>
              {activeWindow.insight}
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.8rem', color: '#475569' }}>
        Aggregate operational estimates only — no individual passenger data shown.
      </div>
    </div>
  );
}
