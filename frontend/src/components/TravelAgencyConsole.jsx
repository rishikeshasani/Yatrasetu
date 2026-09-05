import React, { useState, useEffect } from 'react';
import { fetchTravelAgencyProfile } from '../api/api';

export default function TravelAgencyConsole({ onOpenFleetModal }) {
  const [profile, setProfile] = useState(null);
  const [activeSurgeId, setActiveSurgeId] = useState('somvati_amavasya');
  const [deployBuses, setDeployBuses] = useState(220);

  useEffect(() => {
    fetchTravelAgencyProfile().then((data) => {
      if (data) {
        setProfile(data);
      }
    });
  }, []);

  // Active surge window data
  const activeWindow = profile?.surge_windows?.find((w) => w.id === activeSurgeId) || {
    id: 'somvati_amavasya',
    name: 'Oct 12-13 · Somvati Amavasya',
    corridor: 'Delhi ⇄ Haridwar / Rishikesh',
    total_demand_buses: 370,
    demand_range_min: 340,
    demand_range_max: 400,
    forward_occupancy_low: 90,
    forward_occupancy_high: 97,
    return_occupancy_low: 15,
    return_occupancy_high: 28,
    suggested_forward_fare: 1150,
    forward_surge_pct: '+35%',
    suggested_return_fare: 680,
    return_discount_pct: '-20%',
  };

  const agencyName = profile?.agency_name || 'Himalaya Yatra Travels';
  const totalFleetCapacity = profile?.total_fleet_capacity || 250;
  const baseFare = profile?.base_fare_per_seat || 850;

  const totalDemand = activeWindow.total_demand_buses;
  const coveragePct = Math.min(100, Math.round((deployBuses / totalDemand) * 100));
  const fleetUtilizationPct = Math.round((deployBuses / totalFleetCapacity) * 100);

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      color: '#0F172A',
      borderRadius: '0.85rem',
      padding: '1.75rem',
      margin: '1.5rem 1.5rem 0',
      border: '1px solid #E2E8F0',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
            YatraSetu AI Route Intelligence
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>🚌</span> {agencyName} — Partner Console
          </h2>
          <div style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '0.2rem' }}>
            Simulated Agency Profile • Total Fleet: <strong>{totalFleetCapacity} Buses</strong> • Standard Base Rate: <strong>₹{baseFare}/seat</strong>
          </div>
        </div>

        {/* Surge Window Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#F8FAFC', padding: '0.3rem', borderRadius: '2rem', border: '1px solid #E2E8F0' }}>
          {['somvati_amavasya', 'kartik_purnima', 'maha_shivratri'].map((id) => {
            const labels = {
              somvati_amavasya: 'Oct 12-13 · Somvati Amavasya',
              kartik_purnima: 'Nov 15 · Kartik Purnima',
              maha_shivratri: 'Feb 26 · Maha Shivratri'
            };
            const isActive = activeSurgeId === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSurgeId(id)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '2rem',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? '700' : '500',
                  border: 'none',
                  backgroundColor: isActive ? '#D97706' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#64748B',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {labels[id]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 CORE FEATURES GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '1.25rem' }}>

        {/* FEATURE 1: TOTAL PREDICTED BUS DEMAND */}
        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#92400E', textTransform: 'uppercase' }}>Feature 1 · Total Demand</span>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#FEF3C7', color: '#B45309', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontWeight: 'bold' }}>Live AI Estimate</span>
            </div>
            <h4 style={{ margin: '0 0 0.5rem', color: '#78350F', fontSize: '1rem', fontWeight: '700' }}>
              Total Predicted Bus Demand
            </h4>
            <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#B45309', lineHeight: 1, margin: '0.5rem 0' }}>
              {totalDemand} <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#78350F' }}>buses needed</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#92400E', fontWeight: '600', marginBottom: '0.5rem' }}>
              Range: {activeWindow.demand_range_min}–{activeWindow.demand_range_max} buses total
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#78350F', backgroundColor: '#FEF3C7', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #FCD34D' }}>
            🚨 <strong>4:00 PM Exit Spike:</strong> YOLO CCTV detected +312% exit surge at Har Ki Pauri ghats.
          </div>
        </div>

        {/* FEATURE 2: ACCOMMODATION / FLEET DEPLOYMENT RECOMMENDATION */}
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#1E40AF', textTransform: 'uppercase' }}>Feature 2 · Fleet Capacity</span>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontWeight: 'bold' }}>Your Agency</span>
            </div>
            <h4 style={{ margin: '0 0 0.5rem', color: '#1E3A8A', fontSize: '1rem', fontWeight: '700' }}>
              How Many Buses Will You Deploy?
            </h4>
            
            {/* Deploy Counter Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0' }}>
              <input
                type="number"
                min="0"
                max={totalFleetCapacity}
                value={deployBuses}
                onChange={(e) => setDeployBuses(Math.min(totalFleetCapacity, Math.max(0, parseInt(e.target.value) || 0)))}
                style={{
                  width: '75px',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '0.5rem',
                  border: '1.5px solid #2563EB',
                  fontSize: '1.3rem',
                  fontWeight: 'bold',
                  color: '#1E3A8A',
                  textAlign: 'center'
                }}
              />
              <span style={{ fontSize: '0.88rem', color: '#475569', fontWeight: '600' }}>
                out of <strong>{totalFleetCapacity} buses</strong> available
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max={totalFleetCapacity}
              value={deployBuses}
              onChange={(e) => setDeployBuses(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#2563EB', cursor: 'pointer', marginBottom: '0.5rem' }}
            />
          </div>

          <div style={{ fontSize: '0.78rem', color: '#1E3A8A', backgroundColor: '#EFF6FF', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #BFDBFE', lineHeight: '1.4' }}>
            ✨ <strong>AI Recommendation:</strong> Deploy <strong>{deployBuses} buses</strong> ({fleetUtilizationPct}% of your fleet). This covers <strong>{coveragePct}%</strong> of total corridor demand.
          </div>
        </div>

        {/* FEATURE 3: FORWARD vs RETURN OCCUPANCY & DYNAMIC FARE PRICING */}
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#15803D', textTransform: 'uppercase' }}>Feature 3 · Dynamic Pricing</span>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#DCFCE7', color: '#15803D', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontWeight: 'bold' }}>Per Seat Fares</span>
            </div>
            
            {/* 2-column pricing grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '0.5rem 0' }}>
              {/* Forward Pricing */}
              <div style={{ backgroundColor: '#EFF6FF', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#1E40AF' }}>➡️ FORWARD TRIP</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1E3A8A', margin: '0.2rem 0' }}>
                  {activeWindow.forward_occupancy_low}–{activeWindow.forward_occupancy_high}% <span style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 'normal' }}>full</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#1E40AF', fontWeight: 'bold' }}>
                  ₹{activeWindow.suggested_forward_fare} <span style={{ fontSize: '0.72rem', color: '#166534', backgroundColor: '#DCFCE7', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{activeWindow.forward_surge_pct} Surge</span>
                </div>
              </div>

              {/* Return Pricing */}
              <div style={{ backgroundColor: '#FEF2F2', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#991B1B' }}>↩️ RETURN TRIP</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#DC2626', margin: '0.2rem 0' }}>
                  {activeWindow.return_occupancy_low}–{activeWindow.return_occupancy_high}% <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 'normal' }}>full</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#991B1B', fontWeight: 'bold' }}>
                  ₹{activeWindow.suggested_return_fare} <span style={{ fontSize: '0.72rem', color: '#991B1B', backgroundColor: '#FEE2E2', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{activeWindow.return_discount_pct} Discount</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.76rem', color: '#7F1D1D', backgroundColor: '#FEF2F2', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #FCA5A5', lineHeight: '1.35' }}>
            💡 <strong>Fare Advice:</strong> Charge ₹1,150 on forward seats during high morning demand. Offer ₹680 return tickets to fill empty returning buses.
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
          Aggregate operational estimates for {agencyName} • Corridor: {activeWindow.corridor}
        </span>
        {onOpenFleetModal && (
          <button
            onClick={onOpenFleetModal}
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
            }}
          >
            🚌 Dispatch &amp; Confirm Bus Schedule
          </button>
        )}
      </div>
    </div>
  );
}
